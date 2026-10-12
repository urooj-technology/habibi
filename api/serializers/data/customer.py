from rest_framework import serializers
from api.models.data.customer import Customer


class CustomerSerializer(serializers.ModelSerializer):
    financial_summary = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ["id", "name", "contact", "address", "financial_summary"]
        read_only_fields = ["financial_summary"]

    def get_financial_summary(self, obj):
        """Get the financial summary from the model method"""
        return obj.get_financial_summary()
