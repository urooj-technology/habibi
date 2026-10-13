from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_optional_purchase_supplier"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="sale",
            name="freight_amount",
        ),
        migrations.RemoveField(
            model_name="saleitems",
            name="note",
        ),
    ]
