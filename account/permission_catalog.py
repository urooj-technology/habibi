"""Canonical ERP permission codes (module.action)."""

PERMISSION_CATALOG = [
    # (code, module, action, label)
    ("dashboard.view", "dashboard", "view", "View dashboard"),
    ("inventory.view", "inventory", "view", "View inventory"),
    ("inventory.create", "inventory", "create", "Create inventory"),
    ("inventory.edit", "inventory", "edit", "Edit inventory"),
    ("inventory.delete", "inventory", "delete", "Delete inventory"),
    ("sales.view", "sales", "view", "View sales"),
    ("sales.create", "sales", "create", "Create sales"),
    ("sales.edit", "sales", "edit", "Edit sales"),
    ("sales.delete", "sales", "delete", "Delete sales"),
    ("sale_returns.view", "sale_returns", "view", "View sale returns"),
    ("sale_returns.create", "sale_returns", "create", "Create sale returns"),
    ("sale_returns.edit", "sale_returns", "edit", "Edit sale returns"),
    ("sale_returns.delete", "sale_returns", "delete", "Delete sale returns"),
    ("purchases.view", "purchases", "view", "View purchases"),
    ("purchases.create", "purchases", "create", "Create purchases"),
    ("purchases.edit", "purchases", "edit", "Edit purchases"),
    ("purchases.delete", "purchases", "delete", "Delete purchases"),
    ("accounting.view", "accounting", "view", "View accounting"),
    ("accounting.create", "accounting", "create", "Create accounting"),
    ("accounting.edit", "accounting", "edit", "Edit accounting"),
    ("accounting.delete", "accounting", "delete", "Delete accounting"),
    ("contacts.view", "contacts", "view", "View contacts"),
    ("contacts.create", "contacts", "create", "Create contacts"),
    ("contacts.edit", "contacts", "edit", "Edit contacts"),
    ("contacts.delete", "contacts", "delete", "Delete contacts"),
    ("hr.view", "hr", "view", "View HR"),
    ("hr.create", "hr", "create", "Create HR"),
    ("hr.edit", "hr", "edit", "Edit HR"),
    ("hr.delete", "hr", "delete", "Delete HR"),
    ("backup.view", "backup", "view", "View backups"),
    ("backup.manage", "backup", "manage", "Manage backups"),
    ("users.view", "users", "view", "View users"),
    ("users.create", "users", "create", "Create users"),
    ("users.edit", "users", "edit", "Edit users"),
    ("users.delete", "users", "delete", "Delete users"),
    ("roles.view", "roles", "view", "View roles"),
    ("roles.create", "roles", "create", "Create roles"),
    ("roles.edit", "roles", "edit", "Edit roles"),
    ("roles.delete", "roles", "delete", "Delete roles"),
]

MODULE_ACTIONS = {
    "dashboard": ["view"],
    "inventory": ["view", "create", "edit", "delete"],
    "sales": ["view", "create", "edit", "delete"],
    "sale_returns": ["view", "create", "edit", "delete"],
    "purchases": ["view", "create", "edit", "delete"],
    "accounting": ["view", "create", "edit", "delete"],
    "contacts": ["view", "create", "edit", "delete"],
    "hr": ["view", "create", "edit", "delete"],
    "backup": ["view", "manage"],
    "users": ["view", "create", "edit", "delete"],
    "roles": ["view", "create", "edit", "delete"],
}

ALL_CODES = [row[0] for row in PERMISSION_CATALOG]


def codes_for_modules(*modules, actions=None):
    """Return permission codes for modules, optionally filtered by actions."""
    result = []
    for code, module, action, _label in PERMISSION_CATALOG:
        if module not in modules:
            continue
        if actions is not None and action not in actions:
            continue
        result.append(code)
    return result


# Seeded role → permission codes
SEEDED_ROLE_PERMISSIONS = {
    "admin": ALL_CODES,
    "seller": (
        codes_for_modules("inventory", "sales", "sale_returns")
        + ["contacts.view"]
    ),
    "buyer": codes_for_modules("purchases") + ["contacts.view"],
    "finance": ["dashboard.view"] + codes_for_modules("accounting"),
}

SEEDED_ROLES = [
    {
        "name": "Admin",
        "slug": "admin",
        "description": "Full system access",
        "is_system": True,
    },
    {
        "name": "Seller",
        "slug": "seller",
        "description": "Inventory, sales, and sale returns",
        "is_system": True,
    },
    {
        "name": "Buyer",
        "slug": "buyer",
        "description": "Purchases and supplier contacts",
        "is_system": True,
    },
    {
        "name": "Finance",
        "slug": "finance",
        "description": "Accounting and dashboard",
        "is_system": True,
    },
]
