from .base import DataRoot, models
from api.models.data.category import Category


class Product(DataRoot):
    UNIT_WEIGHT = "weight"
    UNIT_METER = "meter"
    UNIT_KHADA = "khada"
    UNIT_GRAIN = "grain"

    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=255, unique=True)
    is_weight = models.BooleanField(default=False)
    is_meter = models.BooleanField(default=False)
    is_khada = models.BooleanField(default=False)
    is_grain = models.BooleanField(default=False)
    description = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return f"{self.name}"

    def selected_units(self):
        units = []
        if self.is_weight:
            units.append(self.UNIT_WEIGHT)
        if self.is_meter:
            units.append(self.UNIT_METER)
        if self.is_khada:
            units.append(self.UNIT_KHADA)
        if self.is_grain:
            units.append(self.UNIT_GRAIN)
        return units
