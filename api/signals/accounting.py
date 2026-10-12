from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from api.models.accounting.journal import JournalEntry
from api.models.data.purchase import Purchase, PurchaseItem
from api.models.data.sale import Sale, SaleItems
from api.models.data.sale_return import SaleReturn, SaleReturnItem
from api.services.accounting import posting


@receiver(post_save, sender=Sale)
def accounting_on_sale_save(sender, instance, **kwargs):
    posting.sync_sale(instance)


@receiver(post_delete, sender=Sale)
def accounting_on_sale_delete(sender, instance, **kwargs):
    JournalEntry.objects.filter(
        source_type=JournalEntry.SourceType.SALE,
        source_id=instance.pk,
    ).delete()


@receiver(post_save, sender=SaleItems)
@receiver(post_delete, sender=SaleItems)
def accounting_on_sale_item_change(sender, instance, **kwargs):
    if instance.sale_id:
        sale = Sale.objects.filter(pk=instance.sale_id).first()
        if sale:
            posting.sync_sale(sale)


@receiver(post_save, sender=SaleReturn)
def accounting_on_sale_return_save(sender, instance, **kwargs):
    posting.sync_sale_return(instance)


@receiver(post_delete, sender=SaleReturn)
def accounting_on_sale_return_delete(sender, instance, **kwargs):
    JournalEntry.objects.filter(
        source_type=JournalEntry.SourceType.SALE_RETURN,
        source_id=instance.pk,
    ).delete()


@receiver(post_save, sender=SaleReturnItem)
@receiver(post_delete, sender=SaleReturnItem)
def accounting_on_sale_return_item_change(sender, instance, **kwargs):
    if instance.sale_return_id:
        doc = SaleReturn.objects.filter(pk=instance.sale_return_id).first()
        if doc:
            posting.sync_sale_return(doc)


@receiver(post_save, sender=Purchase)
def accounting_on_purchase_save(sender, instance, **kwargs):
    posting.sync_purchase(instance)


@receiver(post_delete, sender=Purchase)
def accounting_on_purchase_delete(sender, instance, **kwargs):
    JournalEntry.objects.filter(
        source_type=JournalEntry.SourceType.PURCHASE,
        source_id=instance.pk,
    ).delete()


@receiver(post_save, sender=PurchaseItem)
@receiver(post_delete, sender=PurchaseItem)
def accounting_on_purchase_item_change(sender, instance, **kwargs):
    if instance.purchase_id:
        purchase = Purchase.objects.filter(pk=instance.purchase_id).first()
        if purchase:
            posting.sync_purchase(purchase)
