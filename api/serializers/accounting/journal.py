from decimal import Decimal

from rest_framework import serializers

from api.models.accounting.journal import JournalEntry, JournalLine
from api.serializers.accounting.account import AccountingAccountSerializer
from api.models.data.customer import Customer
from api.models.data.supplier import Supplier


class CustomerMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "name", "contact")


class SupplierMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ("id", "name", "contact")


class JournalLineSerializer(serializers.ModelSerializer):
    account_details = AccountingAccountSerializer(source="account", read_only=True)
    customer_details = CustomerMiniSerializer(source="customer", read_only=True)
    supplier_details = SupplierMiniSerializer(source="supplier", read_only=True)

    class Meta:
        model = JournalLine
        fields = (
            "id",
            "account",
            "account_details",
            "line_memo",
            "debit_home",
            "credit_home",
            "debit_foreign",
            "credit_foreign",
            "foreign_amount",
            "foreign_currency",
            "exchange_rate",
            "customer",
            "customer_details",
            "supplier",
            "supplier_details",
        )


class JournalEntryListSerializer(serializers.ModelSerializer):
    line_count = serializers.IntegerField(source="_line_count", read_only=True)
    total_debit_home = serializers.DecimalField(
        max_digits=18, decimal_places=2, source="_total_debit_home", read_only=True
    )
    total_credit_home = serializers.DecimalField(
        max_digits=18, decimal_places=2, source="_total_credit_home", read_only=True
    )
    is_balanced = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = (
            "id",
            "reference",
            "memo",
            "entry_date",
            "source_type",
            "source_id",
            "line_count",
            "total_debit_home",
            "total_credit_home",
            "is_balanced",
            "created_at",
            "created_by",
        )

    def get_is_balanced(self, obj) -> bool:
        return (getattr(obj, "_total_debit_home", 0) or 0) == (
            getattr(obj, "_total_credit_home", 0) or 0
        )


class JournalEntryDetailSerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, read_only=True)
    line_count = serializers.IntegerField(source="_line_count", read_only=True)
    total_debit_home = serializers.DecimalField(
        max_digits=18, decimal_places=2, source="_total_debit_home", read_only=True
    )
    total_credit_home = serializers.DecimalField(
        max_digits=18, decimal_places=2, source="_total_credit_home", read_only=True
    )
    is_balanced = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = (
            "id",
            "reference",
            "memo",
            "entry_date",
            "source_type",
            "source_id",
            "created_at",
            "created_by",
            "line_count",
            "total_debit_home",
            "total_credit_home",
            "is_balanced",
            "lines",
        )

    def get_is_balanced(self, obj) -> bool:
        return (getattr(obj, "_total_debit_home", 0) or 0) == (
            getattr(obj, "_total_credit_home", 0) or 0
        )


class ManualJournalLineInputSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    debit_home = serializers.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0"))
    credit_home = serializers.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0"))
    line_memo = serializers.CharField(required=False, allow_blank=True, default="")
    customer_id = serializers.IntegerField(required=False, allow_null=True)
    supplier_id = serializers.IntegerField(required=False, allow_null=True)


class ManualJournalEntryCreateSerializer(serializers.Serializer):
    entry_date = serializers.DateField()
    reference = serializers.CharField(required=False, allow_blank=True, default="")
    memo = serializers.CharField(required=False, allow_blank=True, default="")
    lines = ManualJournalLineInputSerializer(many=True)

    def validate_lines(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("At least two lines are required.")
        return value

    def validate(self, attrs):
        total_debit = Decimal("0")
        total_credit = Decimal("0")
        for line in attrs["lines"]:
            dr = Decimal(line["debit_home"])
            cr = Decimal(line["credit_home"])
            if dr > 0 and cr > 0:
                raise serializers.ValidationError(
                    {"lines": "Each line must not have both debit and credit."}
                )
            if dr <= 0 and cr <= 0:
                raise serializers.ValidationError(
                    {"lines": "Each line must have a debit or a credit amount."}
                )
            total_debit += dr
            total_credit += cr
        if total_debit != total_credit:
            raise serializers.ValidationError(
                "Total debits must equal total credits in home currency (AFN)."
            )
        return attrs

    def create(self, validated_data):
        from api.services.accounting.posting import create_manual_journal

        request = self.context["request"]
        lines = []
        for row in validated_data["lines"]:
            lines.append(
                {
                    "account_id": row["account_id"],
                    "debit_home": row["debit_home"],
                    "credit_home": row["credit_home"],
                    "line_memo": row.get("line_memo") or "",
                    "customer_id": row.get("customer_id"),
                    "supplier_id": row.get("supplier_id"),
                }
            )
        try:
            return create_manual_journal(
                entry_date=validated_data["entry_date"],
                reference=validated_data.get("reference") or "",
                memo=validated_data.get("memo") or "",
                lines_data=lines,
                user=request.user,
            )
        except ValueError as e:
            raise serializers.ValidationError(str(e)) from e

    def update(self, instance, validated_data):
        from api.services.accounting.posting import update_manual_journal

        request = self.context["request"]
        lines = []
        for row in validated_data["lines"]:
            lines.append(
                {
                    "account_id": row["account_id"],
                    "debit_home": row["debit_home"],
                    "credit_home": row["credit_home"],
                    "line_memo": row.get("line_memo") or "",
                    "customer_id": row.get("customer_id"),
                    "supplier_id": row.get("supplier_id"),
                }
            )
        try:
            return update_manual_journal(
                entry=instance,
                entry_date=validated_data["entry_date"],
                reference=validated_data.get("reference") or "",
                memo=validated_data.get("memo") or "",
                lines_data=lines,
                user=request.user,
            )
        except ValueError as e:
            raise serializers.ValidationError(str(e)) from e
