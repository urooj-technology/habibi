from django.db import models
from decimal import Decimal
from api.models.data.base import DataRoot


class Employee(DataRoot):
    name = models.CharField(max_length=255, unique=True)
    fathername = models.CharField(max_length=50, blank=True, null=True)
    tazkira = models.ImageField(upload_to="images/", blank=True, null=True)
    contact = models.CharField(max_length=50, blank=True, null=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    def get_total_salary_paid(self):
        """Salary paid via payroll/advance modules was removed; use journal / HR GL."""
        return Decimal("0")

    def get_total_remaining_salary(self):
        if self.salary:
            return max(Decimal(self.salary) - self.get_total_salary_paid(), Decimal("0"))
        return Decimal("0")

    @property
    def total_advance_paid(self):
        return Decimal("0")

    @property
    def total_payroll_paid(self):
        return Decimal("0")

    @property
    def total_salary_paid(self):
        return self.get_total_salary_paid()

    @property
    def total_remaining(self):
        return self.get_total_remaining_salary()
