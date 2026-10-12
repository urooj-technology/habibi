# api/serializers/data/employee.py
from rest_framework import serializers
from api.models.data.employee import Employee
from api.serializers.data.base import DataRootSerializer


class EmployeeSerializer(DataRootSerializer):
    class Meta:
        model = Employee
        fields = "__all__"
