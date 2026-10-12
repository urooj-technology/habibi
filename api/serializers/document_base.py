"""Reusable serializer helpers for document headers with line items."""

from decimal import Decimal

from rest_framework import serializers


class DocumentLineSerializerMixin:
    """Compute line total from quantity fields used in sales/purchase lines."""

    def get_line_total(self, obj) -> str:
        qty = getattr(obj, "quantity", None) or Decimal("1")
        price = (
            getattr(obj, "unit_price", None)
            or getattr(obj, "sale_price", None)
            or getattr(obj, "buy_price", None)
            or Decimal("0")
        )
        return str((Decimal(str(qty)) * Decimal(str(price))).quantize(Decimal("0.01")))


class NestedLinesCreateMixin:
    """
    Mixin for serializers that accept nested `lines` on create/update.
    Subclasses must set `line_model`, `line_parent_field`, and `lines_serializer_class`.
    """

    line_model = None
    line_parent_field = None
    lines_serializer_class = None

    def _save_lines(self, parent, lines_data):
        if lines_data is None:
            return
        line_model = self.line_model
        parent_field = self.line_parent_field
        line_model.objects.filter(**{parent_field: parent}).delete()
        for row in lines_data:
            line_model.objects.create(**{parent_field: parent}, **row)

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        instance = super().create(validated_data)
        self._save_lines(instance, lines_data)
        return instance

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        instance = super().update(instance, validated_data)
        self._save_lines(instance, lines_data)
        return instance

    def _recalculate_total(self, instance, line_attr: str = "lines"):
        total = Decimal("0")
        for line in getattr(instance, line_attr).all():
            qty = getattr(line, "quantity", None) or Decimal("1")
            price = getattr(line, "unit_price", None) or getattr(
                line, "buy_price", Decimal("0")
            )
            total += Decimal(str(qty)) * Decimal(str(price))
        instance.total_amount = total.quantize(Decimal("0.01"))
        instance.save(update_fields=["total_amount"])
