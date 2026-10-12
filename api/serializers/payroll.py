from rest_framework import serializers

from api.choices import DocumentStatus
from api.models.payroll import PayrollRun, PayrollRunLine
from api.serializers.data.base import DataRootSerializer
from api.serializers.document_base import NestedLinesCreateMixin


class PayrollRunLineSerializer(DataRootSerializer):
    employee_details = serializers.SerializerMethodField(read_only=True)
    net_amount = serializers.DecimalField(
        max_digits=18, decimal_places=2, read_only=True
    )

    class Meta:
        model = PayrollRunLine
        exclude = ("payroll_run",)
        read_only_fields = ("net_amount", "employee_details")

    def get_employee_details(self, obj):
        emp = obj.employee
        if not emp:
            return None
        return {
            "id": emp.id,
            "name": emp.name,
            "fathername": emp.fathername,
            "contact": emp.contact,
            "salary": str(emp.salary) if emp.salary is not None else None,
        }

    def validate(self, attrs):
        gross = attrs.get("gross_amount")
        deductions = attrs.get("deductions")
        if gross is not None and deductions is not None:
            if deductions > gross:
                raise serializers.ValidationError(
                    {"deductions": "Deductions cannot exceed gross amount."}
                )
        return attrs


class PayrollRunSerializer(NestedLinesCreateMixin, DataRootSerializer):
    lines = PayrollRunLineSerializer(many=True, required=False)
    line_model = PayrollRunLine
    line_parent_field = "payroll_run"
    lines_serializer_class = PayrollRunLineSerializer
    period_label = serializers.SerializerMethodField(read_only=True)
    lines_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PayrollRun
        fields = "__all__"
        read_only_fields = ("total_amount", "period_label", "lines_count")

    def get_period_label(self, obj):
        if not obj.period_start or not obj.period_end:
            return ""
        return f"{obj.period_start} → {obj.period_end}"

    def get_lines_count(self, obj):
        # Prefer prefetched cache when available
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "lines" in obj._prefetched_objects_cache
        ):
            return len(obj._prefetched_objects_cache["lines"])
        return obj.lines.count()

    def validate(self, attrs):
        period_start = attrs.get("period_start", getattr(self.instance, "period_start", None))
        period_end = attrs.get("period_end", getattr(self.instance, "period_end", None))
        if period_start and period_end and period_end < period_start:
            raise serializers.ValidationError(
                {"period_end": "Period end must be on or after period start."}
            )

        # Block edits on posted/cancelled runs
        if self.instance and self.instance.status != DocumentStatus.DRAFT:
            raise serializers.ValidationError(
                "Only draft payroll runs can be edited."
            )
        return attrs

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._recalculate_payroll_total(instance)
        return instance

    def update(self, instance, validated_data):
        # Status changes go through PostableDocumentMixin actions, not this form
        validated_data.pop("status", None)
        instance = super().update(instance, validated_data)
        self._recalculate_payroll_total(instance)
        return instance

    def _recalculate_payroll_total(self, instance):
        from decimal import Decimal

        total = sum((line.net_amount for line in instance.lines.all()), Decimal("0"))
        instance.total_amount = total.quantize(Decimal("0.01"))
        instance.save(update_fields=["total_amount"])
