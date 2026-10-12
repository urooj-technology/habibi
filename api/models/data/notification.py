from django.conf import settings
from django.db import models

from api.models.data.base import DataRoot


class Notification(DataRoot):
    class Type(models.TextChoices):
        LOW_STOCK = "low_stock", "Low stock"
        SYSTEM = "system", "System"
        SALE = "sale", "Sale"
        PURCHASE = "purchase", "Purchase"
        PAYMENT = "payment", "Payment"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(
        max_length=32,
        choices=Type.choices,
        default=Type.SYSTEM,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")
    link = models.CharField(max_length=255, blank=True, default="")
    ref_type = models.CharField(max_length=64, blank=True, default="", db_index=True)
    ref_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-id"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-id"]),
        ]

    def __str__(self):
        return f"{self.type}: {self.title} → {self.recipient_id}"
