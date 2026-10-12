from rest_framework import serializers
from api.models.data.sale import Sale, SaleItems
from api.serializers.data.base import DataRootSerializer


def _product_measurement_details(product):
    if not product:
        return None
    return {
        "id": product.id,
        "name": product.name,
        "is_weight": product.is_weight,
        "is_meter": product.is_meter,
        "is_khada": product.is_khada,
        "is_grain": product.is_grain,
        "description": product.description,
    }


class SaleItemsSerializer(DataRootSerializer):
    sale_details = serializers.SerializerMethodField()
    inventory_details = serializers.SerializerMethodField()

    class Meta:
        model = SaleItems
        fields = "__all__"

    def get_sale_details(self, obj):
        if obj.sale:
            return {
                "id": obj.sale.id,
                "received_amount": obj.sale.received_amount,
                "currency": obj.sale.currency,
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
            "product_details": _product_measurement_details(product),
            "thickness": inv.thickness,
            "weight_amount": inv.weight_amount,
            "meter_amount": inv.meter_amount,
            "khada_amount": inv.khada_amount,
            "grain_amount": inv.grain_amount,
            "buy_price": inv.buy_price,
            "sell_price": getattr(inv, "sell_price", None),
            "currency": getattr(inv, "currency", None),
        }


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
