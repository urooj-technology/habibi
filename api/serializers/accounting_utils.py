from api.models.accounting_utils import OpeningBalanceEntry
from api.serializers.data.base import DataRootSerializer


class OpeningBalanceEntrySerializer(DataRootSerializer):
    class Meta:
        model = OpeningBalanceEntry
        fields = "__all__"
