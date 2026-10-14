from rest_framework import serializers

from api.models.data.sale import Sale, SaleItems
from api.serializers.data.base import DataRootSerializer


def _product_details(product):
    if not product:
        return None
    return {
        "id": product.id,
        "name": product.name,
        "barcode": product.barcode,
    }


class SaleItemsSerializer(DataRootSerializer):
    sale_details = serializers.SerializerMethodField()
    inventory_details = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = SaleItems
        fields = "__all__"

    def get_sale_details(self, obj):
        if obj.sale:
            return {
                "id": obj.sale.id,
                "received_amount": obj.sale.received_amount,
            }
        return None

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
            "buy_price": inv.buy_price,
            "sell_price": inv.sell_price,
        }

    def get_line_total(self, obj):
        return obj.line_total


class SaleSerializer(DataRootSerializer):
    customer_details = serializers.SerializerMethodField()
    sale_items = SaleItemsSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
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
