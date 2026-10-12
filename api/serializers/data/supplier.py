from rest_framework import serializers
from api.models.data.supplier import Supplier
from api.serializers.data.base import DataRootSerializer


class SupplierSerializer(DataRootSerializer):
    financial_summary = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = "__all__"
        read_only_fields = ["financial_summary"]

    def get_financial_summary(self, obj):
        """Get the financial summary from the model method"""
        return obj.get_financial_summary()
