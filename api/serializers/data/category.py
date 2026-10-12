from rest_framework import serializers
from api.models.data.category import Category
from api.serializers.data.base import DataRootSerializer


class CategorySerializer(DataRootSerializer):
    class Meta:
        model = Category
        fields = "__all__"
