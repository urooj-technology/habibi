from .base import DataRoot, models


class Category(DataRoot):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return f"{self.name}"
