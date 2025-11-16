"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import type { InventoryItem } from "@/lib/hooks/useInventory";

export default function ShortagesPage() {
  const [shortages, setShortages] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all items with negative or zero stock
        const { data: shortageData } = await (supabase as any)
          .from("inventory_items")
          .select("*")
          .lte("qty_in_warehouse", 0)
          .order("qty_in_warehouse", { ascending: true });

        if (shortageData) {
          setShortages(shortageData);
          
          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(shortageData.map((item: any) => item.gear_type).filter(Boolean))
          ) as string[];
          setCategories(uniqueCategories.sort());
        }
      } catch (error) {
        console.error("Error fetching shortages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredShortages = filterCategory
    ? shortages.filter((item) => item.gear_type === filterCategory)
    : shortages;

  const totalValue = filteredShortages.reduce(
    (sum, item) => sum + Math.abs((item as any).qty_in_warehouse) * ((item as any).unit_value || 0),
    0
  );

  return (
    <DashboardLayout>
      <div style={{ padding: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "var(--color-text-main)",
            marginBottom: "0.5rem",
          }}
        >
          ⚠️ Inventory Shortages
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#999999",
            marginBottom: "1.5rem",
          }}
        >
          Items at or below zero stock level
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #333333",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#999999",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Total Shortages
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#ff6b6b",
              }}
            >
              {loading ? "..." : filteredShortages.length}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #333333",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#999999",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Units Short
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#fbbf24",
              }}
            >
              {loading
                ? "..."
                : filteredShortages.reduce(
                    (sum, item) => sum + Math.abs(item.qty_in_warehouse),
                    0
                  )}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #333333",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#999999",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Shortfall Value
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#3b82f6",
              }}
            >
              {loading ? "..." : `$${totalValue.toFixed(2)}`}
            </p>
          </div>
        </div>

        {/* Filter */}
        {!loading && categories.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                fontSize: "0.875rem",
                color: "#999999",
                marginRight: "0.75rem",
              }}
            >
              Filter by Category:
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #333333",
                backgroundColor: "#1a1a1a",
                color: "#e0e0e0",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Table */}
        {!loading && filteredShortages.length > 0 ? (
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #ff6b6b",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #333333" }}>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#999999",
                    }}
                  >
                    Item Name
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#999999",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "center",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#999999",
                    }}
                  >
                    Stock Level
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "center",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#999999",
                    }}
                  >
                    Unit Cost
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "center",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#999999",
                    }}
                  >
                    Shortage Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShortages.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #333333",
                      backgroundColor:
                        item.qty_in_warehouse < -5
                          ? "rgba(255, 107, 107, 0.1)"
                          : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.75rem",
                        color: "#e0e0e0",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      {item.name}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        color: "#999999",
                        fontSize: "0.875rem",
                      }}
                    >
                      {item.category || "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        color: "#ff6b6b",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    >
                      {item.qty_in_warehouse}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        color: "#999999",
                        fontSize: "0.875rem",
                      }}
                    >
                      ${((item as any).unit_value || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        color: "#fbbf24",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    >
                      ${(Math.abs((item as any).qty_in_warehouse) * ((item as any).unit_value || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #333333",
              borderRadius: "0.5rem",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#999999", fontSize: "0.875rem" }}>
              {loading ? "Loading..." : "No shortages found! All items are in stock."}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
