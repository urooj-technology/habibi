from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="discount_amount",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                help_text="Invoice discount in money; total_amount is net after this.",
                max_digits=12,
            ),
        ),
        migrations.AddField(
            model_name="sale",
            name="discount_percent",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                help_text="Invoice discount percent (stored for re-edit; amount is authoritative).",
                max_digits=7,
            ),
        ),
    ]
