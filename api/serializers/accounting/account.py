from decimal import Decimal

from rest_framework import serializers

from api.models.accounting.account import AccountingAccount
from api.services.accounting.balances import signed_balance


class AccountingAccountSerializer(serializers.ModelSerializer):
    """Balances in account currency (total_debit/credit/balance) and AFN book (total_*_afn)."""

    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    total_debit_afn = serializers.SerializerMethodField()
    total_credit_afn = serializers.SerializerMethodField()
    balance_afn = serializers.SerializerMethodField()
    # Legacy API fields: *_home = AFN book; *_foreign kept for compatibility (raw column sums)
    total_debit_home = serializers.SerializerMethodField()
    total_credit_home = serializers.SerializerMethodField()
    balance_home = serializers.SerializerMethodField()
    total_debit_foreign = serializers.SerializerMethodField()
    total_credit_foreign = serializers.SerializerMethodField()
    balance_foreign = serializers.SerializerMethodField()

    class Meta:
        model = AccountingAccount
        fields = (
            "id",
            "code",
            "name",
            "currency",
            "account_type",
            "role",
            "parent",
            "is_active",
            "notes",
            "total_debit",
            "total_credit",
            "balance",
            "total_debit_afn",
            "total_credit_afn",
            "balance_afn",
            "total_debit_home",
            "total_credit_home",
            "balance_home",
            "total_debit_foreign",
            "total_credit_foreign",
            "balance_foreign",
        )

    def _debit_ccy(self, obj) -> Decimal:
        return getattr(obj, "_debit_ccy", None) or Decimal("0.00")

    def _credit_ccy(self, obj) -> Decimal:
        return getattr(obj, "_credit_ccy", None) or Decimal("0.00")

    def _debit_afn(self, obj) -> Decimal:
        return getattr(obj, "_debit_afn", None) or Decimal("0.00")

    def _credit_afn(self, obj) -> Decimal:
        return getattr(obj, "_credit_afn", None) or Decimal("0.00")

    def get_total_debit(self, obj) -> Decimal:
        return self._debit_ccy(obj)

    def get_total_credit(self, obj) -> Decimal:
        return self._credit_ccy(obj)

    def get_balance(self, obj) -> Decimal:
        return signed_balance(self._debit_ccy(obj), self._credit_ccy(obj), obj.account_type)

    def get_total_debit_afn(self, obj) -> Decimal:
        return self._debit_afn(obj)

    def get_total_credit_afn(self, obj) -> Decimal:
        return self._credit_afn(obj)

    def get_balance_afn(self, obj) -> Decimal:
        return signed_balance(self._debit_afn(obj), self._credit_afn(obj), obj.account_type)

    def get_total_debit_home(self, obj) -> Decimal:
        return self.get_total_debit_afn(obj)

    def get_total_credit_home(self, obj) -> Decimal:
        return self.get_total_credit_afn(obj)

    def get_balance_home(self, obj) -> Decimal:
        return self.get_balance_afn(obj)

    def get_total_debit_foreign(self, obj) -> Decimal:
        return getattr(obj, "_debit_foreign_raw", None) or Decimal("0.00")

    def get_total_credit_foreign(self, obj) -> Decimal:
        return getattr(obj, "_credit_foreign_raw", None) or Decimal("0.00")

    def get_balance_foreign(self, obj) -> Decimal:
        return signed_balance(
            self.get_total_debit_foreign(obj),
            self.get_total_credit_foreign(obj),
            obj.account_type,
        )
