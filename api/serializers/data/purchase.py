from rest_framework import serializers

from api.models.data.purchase import Purchase, PurchaseItem
from api.serializers.data.base import DataRootSerializer


def _product_details(product):
    if not product:
        return None
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
    }


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_details = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseItem
        fields = "__all__"

    def get_product_details(self, obj):
        return _product_details(obj.product)

    def get_line_total(self, obj):
        return obj.line_total


class PurchaseSerializer(DataRootSerializer):
    supplier_details = serializers.SerializerMethodField()
    purchase_items = PurchaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = "__all__"

    def get_supplier_details(self, obj):
        if obj.supplier:
            return {
                "id": obj.supplier.id,
                "name": obj.supplier.name,
                "contact": obj.supplier.contact,
                "address": obj.supplier.address,
            }
        return None
