package com.omnisales.app.domain

enum class IndustryProfile { GENERAL_RETAIL, ELECTRONICS, SPARE_PARTS, GROCERY, FOOD_SERVICE }
enum class WorkMode { SHIFT_BASED, OPEN_SALES }
enum class PosLayout { GRID_CART, LIST_BARCODE, TOUCH_TILES, COMPACT_SPLIT }

data class BranchSettings(
    val branchId: String = "branch-1",
    val name: String = "OmniSales",
    val industry: IndustryProfile = IndustryProfile.GENERAL_RETAIL,
    val workMode: WorkMode = WorkMode.SHIFT_BASED,
    val posLayout: PosLayout = PosLayout.GRID_CART,
    val walkInSalesEnabled: Boolean = true,
    val currencySymbol: String = "د.ل",
)

data class Product(
    val id: String,
    val name: String,
    val barcode: String,
    val retailPrice: Double,
)
