import random

from .base import DataRoot, models
from api.models.data.category import Category

# EAN-13 numbers starting with "2" are reserved for in-store (restricted
# circulation) use, so generated codes never collide with real retail barcodes.
GENERATED_BARCODE_PREFIX = "20"


def ean13_check_digit(first12: str) -> str:
    total = sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(first12))
    return str((10 - total % 10) % 10)


def build_ean13(seed: int) -> str:
    body = f"{GENERATED_BARCODE_PREFIX}{seed:010d}"[-12:]
    return body + ean13_check_digit(body)


class Product(DataRoot):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=255, unique=True)
    barcode = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text="Leave empty to auto-generate an internal EAN-13 barcode.",
    )

    def __str__(self):
        return f"{self.name}"

    @classmethod
    def generate_barcode(cls, seed=None) -> str:
        candidate = build_ean13(seed) if seed else None
        attempts = 0
        while not candidate or cls.all_objects.filter(barcode=candidate).exists():
            attempts += 1
            if attempts > 50:
                raise RuntimeError("Could not generate a unique barcode.")
            candidate = build_ean13(random.randint(1, 9_999_999_999))
        return candidate

    def save(self, *args, **kwargs):
        if self.barcode is not None:
            self.barcode = self.barcode.strip() or None
        super().save(*args, **kwargs)
        if not self.barcode:
            self.barcode = Product.generate_barcode(seed=self.pk)
            super().save(update_fields=["barcode"])
