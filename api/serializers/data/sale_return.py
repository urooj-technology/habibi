from rest_framework import serializers

from api.models.data.sale_return import SaleReturn, SaleReturnItem
from api.serializers.data.base import DataRootSerializer
from api.serializers.data.sale import _product_details


class SaleReturnItemSerializer(DataRootSerializer):
    inventory_details = serializers.SerializerMethodField()
    sale_item = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SaleReturnItem
        fields = "__all__"

    def get_inventory_details(self, obj):
        inv = obj.inventory
        if not inv:
            return None
        product = inv.product
        return {
            "id": inv.id,
            "product": inv.product_id,
            "product_name": product.name if product else None,
            "product_details": _product_details(product),
            "quantity": inv.quantity,
        }


class SaleReturnSerializer(DataRootSerializer):
    customer_details = serializers.SerializerMethodField()
    sale_details = serializers.SerializerMethodField()
    items = SaleReturnItemSerializer(many=True, read_only=True)
    credited_amount = serializers.SerializerMethodField()

    class Meta:
        model = SaleReturn
        fields = "__all__"

    def get_customer_details(self, obj):
        if obj.customer:
            return {
                "id": obj.customer.id,
                "name": obj.customer.name,
                "contact": obj.customer.contact,
                "address": obj.customer.address,
            }
        return None

    def get_sale_details(self, obj):
        if not obj.sale_id:
            return None
        sale = obj.sale
        return {
            "id": sale.id,
            "sale_date": sale.sale_date,
            "total_amount": sale.total_amount,
            "customer_id": sale.customer_id,
        }

    def get_credited_amount(self, obj):
        from decimal import Decimal

        total = Decimal(str(obj.total_amount or 0))
        refunded = Decimal(str(obj.refunded_amount or 0))
        return str((total - refunded).quantize(Decimal("0.01")))
