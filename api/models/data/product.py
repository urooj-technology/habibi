from .base import DataRoot, models
from api.models.data.category import Category


class Product(DataRoot):
    """Clothing product — name, category, description only."""

    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=255, unique=True)
    description = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return f"{self.name}"
