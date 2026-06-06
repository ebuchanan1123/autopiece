import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBody } from "@/src/components/screen-body";
import {
  getAdminListings,
  getAdminOrder,
  getAdminOrders,
  getAdminSellers,
  getAdminUsers,
  getAuditLog,
  updateListingStatus,
  updateSellerVerification,
  type AdminOrderDetail,
  type AdminSeller,
  type AuditLog,
} from "@/src/features/admin/admin.api";
import type { AuthUser } from "@/src/features/auth/auth.api";
import type { Listing } from "@/src/features/listings/listings.api";
import type { Order } from "@/src/features/orders/orders.api";

type TabKey = "sellers" | "listings" | "orders" | "users" | "audit";

const TABS: { key: TabKey; label: string }[] = [
  { key: "sellers", label: "Sellers" },
  { key: "listings", label: "Listings" },
  { key: "orders", label: "Orders" },
  { key: "users", label: "Users" },
  { key: "audit", label: "Audit" },
];

type OrderDetail = AdminOrderDetail | null;

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("sellers");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [orderDetail, setOrderDetail] = useState<OrderDetail>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  const load = useCallback(async () => {
    const [nextUsers, nextSellers, nextListings, nextOrders, nextAudit] =
      await Promise.all([
        getAdminUsers(),
        getAdminSellers(),
        getAdminListings(),
        getAdminOrders(),
        getAuditLog(),
      ]);
    setUsers(nextUsers);
    setSellers(nextSellers);
    setListings(nextListings);
    setOrders(nextOrders);
    setAudit(nextAudit);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e: any) {
        Alert.alert("Admin unavailable", e?.message ?? "Could not load admin data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  // Reset filters when switching tabs
  useEffect(() => {
    setSearch("");
    setStatusFilter("all");
  }, [activeTab]);

  const stats = useMemo(
    () => ({
      users: users.length,
      sellers: sellers.length,
      pendingSellers: sellers.filter((s) => !s.isVerified).length,
      liveListings: listings.filter((l) => l.status === "active").length,
      orders: orders.length,
    }),
    [listings, orders.length, sellers, users.length],
  );

  const q = search.toLowerCase().trim();

  const filteredSellers = useMemo(() => {
    let result = sellers;
    if (statusFilter !== "all")
      result = result.filter((s) =>
        statusFilter === "verified" ? s.isVerified : !s.isVerified,
      );
    if (q)
      result = result.filter(
        (s) =>
          s.storeName.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.wilaya.toLowerCase().includes(q) ||
          s.user?.email?.toLowerCase().includes(q) ||
          s.phone?.includes(q),
      );
    return result;
  }, [sellers, q, statusFilter]);

  const filteredListings = useMemo(() => {
    let result = listings;
    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);
    if (q)
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          (l as any).storeName?.toLowerCase().includes(q) ||
          l.wilaya?.toLowerCase().includes(q),
      );
    return result;
  }, [listings, q, statusFilter]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") result = result.filter((o) => o.status === statusFilter);
    if (q)
      result = result.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.paymentMethod?.toLowerCase().includes(q),
      );
    return result;
  }, [orders, q, statusFilter]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (statusFilter !== "all") result = result.filter((u) => u.role === statusFilter);
    if (q)
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q),
      );
    return result;
  }, [users, q, statusFilter]);

  const filteredAudit = useMemo(() => {
    if (!q) return audit;
    return audit.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.entityType.toLowerCase().includes(q),
    );
  }, [audit, q]);

  async function refresh() {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleSeller(seller: AdminSeller) {
    try {
      await updateSellerVerification(Number(seller.user?.id), !seller.isVerified);
      await refresh();
    } catch (e: any) {
      Alert.alert("Could not update seller", e?.message ?? "Please try again.");
    }
  }

  async function hideListing(listing: Listing) {
    try {
      await updateListingStatus(
        Number(listing.id),
        listing.status === "hidden" ? "active" : "hidden",
      );
      await refresh();
    } catch (e: any) {
      Alert.alert("Could not update listing", e?.message ?? "Please try again.");
    }
  }

  async function openOrderDetail(order: Order) {
    try {
      setOrderDetailLoading(true);
      const detail = await getAdminOrder(Number(order.id));
      setOrderDetail(detail);
    } catch (e: any) {
      Alert.alert("Could not load order", e?.message ?? "Please try again.");
    } finally {
      setOrderDetailLoading(false);
    }
  }

  const filterOptions = useMemo<{ label: string; value: string }[]>(() => {
    switch (activeTab) {
      case "sellers":
        return [
          { label: "All", value: "all" },
          { label: "Verified", value: "verified" },
          { label: "Pending", value: "pending" },
        ];
      case "listings":
        return [
          { label: "All", value: "all" },
          { label: "Active", value: "active" },
          { label: "Hidden", value: "hidden" },
          { label: "Sold out", value: "sold_out" },
          { label: "Draft", value: "draft" },
          { label: "Removed", value: "removed" },
        ];
      case "orders":
        return [
          { label: "All", value: "all" },
          { label: "Reserved", value: "reserved" },
          { label: "In progress", value: "in_progress" },
          { label: "Picked up", value: "picked_up" },
          { label: "Paid", value: "paid" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Expired", value: "expired" },
        ];
      case "users":
        return [
          { label: "All", value: "all" },
          { label: "Client", value: "client" },
          { label: "Seller", value: "seller" },
          { label: "Admin", value: "admin" },
        ];
      default:
        return [];
    }
  }, [activeTab]);

  return (
    <ScreenBody>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2C2B" />
          </Pressable>
          <View>
            <Text style={styles.title}>Admin console</Text>
            <Text style={styles.subtitle}>Operations, moderation, and audit trail</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Stat label="Users" value={stats.users} />
          <Stat label="Sellers" value={stats.sellers} />
          <Stat
            label="Pending"
            value={stats.pendingSellers}
            highlight={stats.pendingSellers > 0}
          />
          <Stat label="Live listings" value={stats.liveListings} />
          <Stat label="Orders" value={stats.orders} />
        </View>

        {stats.pendingSellers > 0 && (
          <Pressable
            style={styles.pendingBanner}
            onPress={() => {
              setActiveTab("sellers");
              setStatusFilter("pending");
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#9B6000" />
            <Text style={styles.pendingBannerText}>
              {stats.pendingSellers} seller{stats.pendingSellers !== 1 ? "s" : ""} awaiting
              approval — tap to review
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#9B6000" />
          </Pressable>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key ? styles.tabActive : styles.tabInactive,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#72817F" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === "sellers"
                  ? "Search by store, city, email…"
                  : activeTab === "listings"
                    ? "Search by title, store, wilaya…"
                    : activeTab === "orders"
                      ? "Search by order number…"
                      : activeTab === "users"
                        ? "Search by email or username…"
                        : "Search by action or entity…"
              }
              placeholderTextColor="#A3B0AC"
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {filterOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {filterOptions.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.filterChip,
                  statusFilter === opt.value && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(opt.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === opt.value && styles.filterChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#116B62" />
          </View>
        ) : (
          <View style={styles.list}>
            {activeTab === "sellers" &&
              (filteredSellers.length === 0 ? (
                <EmptyState />
              ) : (
                filteredSellers.map((seller) => (
                  <View key={seller.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardTextWrap}>
                        <Text style={styles.cardTitle}>{seller.storeName}</Text>
                        <Text style={styles.cardMeta}>
                          {seller.city}, {seller.wilaya}
                        </Text>
                        {seller.user?.email ? (
                          <Text style={styles.cardDetail}>{seller.user.email}</Text>
                        ) : null}
                        {seller.phone ? (
                          <Text style={styles.cardDetail}>{seller.phone}</Text>
                        ) : null}
                        {seller.businessType ? (
                          <Text style={styles.cardDetail}>{seller.businessType}</Text>
                        ) : null}
                        {seller.user?.createdAt ? (
                          <Text style={styles.cardDetail}>
                            Joined {new Date(seller.user.createdAt).toLocaleDateString()}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.cardRight}>
                        <StatusPill
                          label={seller.isVerified ? "Verified" : "Pending approval"}
                          tone={seller.isVerified ? "good" : "warn"}
                        />
                      </View>
                    </View>
                    <Pressable
                      style={[
                        styles.secondaryButton,
                        !seller.isVerified && styles.secondaryButtonHighlight,
                      ]}
                      onPress={() => toggleSeller(seller)}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          !seller.isVerified && styles.secondaryButtonTextHighlight,
                        ]}
                      >
                        {seller.isVerified ? "Revoke verification" : "Approve seller"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              ))}

            {activeTab === "listings" &&
              (filteredListings.length === 0 ? (
                <EmptyState />
              ) : (
                filteredListings.map((listing) => (
                  <View key={listing.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardTextWrap}>
                        <Text style={styles.cardTitle}>{listing.title}</Text>
                        <Text style={styles.cardMeta}>
                          {listing.priceDzd} DZD • {listing.quantityAvailable} left
                        </Text>
                        {(listing as any).storeName ? (
                          <Text style={styles.cardDetail}>
                            {(listing as any).storeName}
                          </Text>
                        ) : null}
                        <Text style={styles.cardDetail}>
                          {listing.city}, {listing.wilaya}
                        </Text>
                      </View>
                      <StatusPill
                        label={listing.status ?? "unknown"}
                        tone={
                          listing.status === "active"
                            ? "good"
                            : listing.status === "hidden" || listing.status === "removed"
                              ? "bad"
                              : "neutral"
                        }
                      />
                    </View>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => hideListing(listing)}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {listing.status === "hidden" ? "Restore listing" : "Hide listing"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              ))}

            {activeTab === "orders" &&
              (filteredOrders.length === 0 ? (
                <EmptyState />
              ) : (
                filteredOrders.map((order) => (
                  <Pressable
                    key={order.id}
                    style={styles.card}
                    onPress={() => openOrderDetail(order)}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.cardTextWrap}>
                        <Text style={styles.cardTitle}>{order.orderNumber}</Text>
                        <Text style={styles.cardMeta}>
                          {order.totalDzd} DZD • {order.paymentMethod}
                        </Text>
                        <Text style={styles.cardDetail}>
                          {new Date(order.createdAt).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.cardRight}>
                        <StatusPill
                          label={order.status}
                          tone={
                            order.status === "picked_up" || order.status === "paid"
                              ? "good"
                              : order.status === "cancelled" || order.status === "expired"
                                ? "bad"
                                : "neutral"
                          }
                        />
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#A3B0AC"
                          style={{ marginTop: 4 }}
                        />
                      </View>
                    </View>
                  </Pressable>
                ))
              ))}

            {activeTab === "users" &&
              (filteredUsers.length === 0 ? (
                <EmptyState />
              ) : (
                filteredUsers.map((user) => (
                  <View key={user.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardTextWrap}>
                        <Text style={styles.cardTitle}>
                          {user.username || user.email}
                        </Text>
                        {user.username ? (
                          <Text style={styles.cardMeta}>{user.email}</Text>
                        ) : null}
                        {user.phone ? (
                          <Text style={styles.cardDetail}>{user.phone}</Text>
                        ) : null}
                        {user.createdAt ? (
                          <Text style={styles.cardDetail}>
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </Text>
                        ) : null}
                      </View>
                      <StatusPill
                        label={user.role}
                        tone={user.role === "admin" ? "warn" : "neutral"}
                      />
                    </View>
                  </View>
                ))
              ))}

            {activeTab === "audit" &&
              (filteredAudit.length === 0 ? (
                <EmptyState />
              ) : (
                filteredAudit.map((entry) => (
                  <View key={entry.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{entry.action}</Text>
                    <Text style={styles.cardMeta}>
                      {entry.entityType}
                      {entry.entityId ? ` #${entry.entityId}` : ""} •{" "}
                      {new Date(entry.createdAt).toLocaleString()}
                    </Text>
                    {entry.metadata ? (
                      <Text style={styles.cardDetail} numberOfLines={2}>
                        {JSON.stringify(entry.metadata)}
                      </Text>
                    ) : null}
                  </View>
                ))
              ))}
          </View>
        )}
      </ScrollView>

      {/* Order detail modal */}
      <Modal
        visible={!!orderDetail || orderDetailLoading}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOrderDetail(null)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order detail</Text>
            <Pressable
              onPress={() => setOrderDetail(null)}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={22} color="#1F2C2B" />
            </Pressable>
          </View>

          {orderDetailLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#116B62" />
            </View>
          ) : orderDetail ? (
            <ScrollView contentContainerStyle={styles.modalBody}>
              <OrderDetailSection detail={orderDetail} />
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </ScreenBody>
  );
}

function OrderDetailSection({ detail }: { detail: AdminOrderDetail }) {
  const { order, customer, payment, items } = detail;
  const rows: { label: string; value: string }[] = [
    { label: "Order number", value: order.orderNumber },
    { label: "Status", value: order.status },
    { label: "Payment method", value: order.paymentMethod },
    { label: "Total", value: `${order.totalDzd} DZD` },
    { label: "Customer ID", value: String(order.customerId) },
    {
      label: "Pickup PIN",
      value: order.pickupPin ?? "—",
    },
    {
      label: "Created",
      value: new Date(order.createdAt).toLocaleString(),
    },
    {
      label: "Updated",
      value: new Date(order.updatedAt).toLocaleString(),
    },
  ];

  const customerRows: { label: string; value: string }[] = customer
    ? [
        { label: "Customer", value: customer.username || customer.email },
        { label: "Email", value: customer.email },
        { label: "Phone", value: customer.phone ?? "—" },
        { label: "Role", value: customer.role },
      ]
    : [];

  const paymentRows: { label: string; value: string }[] = payment
    ? [
        { label: "Payment ID", value: String(payment.id) },
        { label: "Provider", value: payment.provider },
        { label: "Status", value: payment.status },
        { label: "Amount", value: `${payment.amountDzd} DZD` },
        {
          label: "Provider ref",
          value: payment.providerPaymentId ?? "—",
        },
        {
          label: "Initiated",
          value: new Date(payment.createdAt).toLocaleString(),
        },
        {
          label: "Updated",
          value: new Date(payment.updatedAt).toLocaleString(),
        },
      ]
    : [];

  return (
    <View style={{ gap: 24 }}>
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Order</Text>
        {rows.map((row) => (
          <View key={row.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{row.label}</Text>
            <Text style={styles.detailValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Payment</Text>
        {payment ? (
          paymentRows.map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.cardDetail}>No payment record</Text>
        )}
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Customer</Text>
        {customer ? (
          customerRows.map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.detailEmpty}>Customer record not found</Text>
        )}
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Items</Text>
        {items.length ? (
          items.map((item) => (
            <View key={item.id} style={styles.itemBlock}>
              <View style={styles.itemBlockTop}>
                <Text style={styles.itemTitle}>
                  {item.listing?.title ?? `Listing #${item.listingId}`}
                </Text>
                <StatusPill
                  label={item.status}
                  tone={
                    item.status === "picked_up" || item.status === "paid"
                      ? "good"
                      : item.status === "cancelled" ||
                          item.status === "expired" ||
                          item.status === "payment_failed"
                        ? "bad"
                        : "neutral"
                  }
                />
              </View>
              <Text style={styles.cardDetail}>
                Sale {item.saleNumber} • Seller #{item.sellerId} •{" "}
                {item.unitPriceDzd} DZD
              </Text>
              {item.listing?.address ? (
                <Text style={styles.cardDetail}>{item.listing.address}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.detailEmpty}>No order items found</Text>
        )}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === "good"
          ? styles.statusGood
          : tone === "warn"
            ? styles.statusWarn
            : tone === "bad"
              ? styles.statusBad
              : styles.statusNeutral,
      ]}
    >
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No results</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "900", color: "#1F2C2B" },
  subtitle: { marginTop: 4, color: "#72817F", fontWeight: "700" },
  statsGrid: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stat: {
    minWidth: 104,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 16,
    padding: 14,
  },
  statHighlight: {
    backgroundColor: "#FFF8E7",
    borderColor: "#F5C842",
  },
  statValue: { fontSize: 24, fontWeight: "900", color: "#116B62" },
  statValueHighlight: { color: "#9B6000" },
  statLabel: { marginTop: 4, color: "#6F7D7A", fontWeight: "700" },
  pendingBanner: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#F5C842",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pendingBannerText: {
    flex: 1,
    color: "#9B6000",
    fontWeight: "700",
    fontSize: 13,
  },
  tabs: { gap: 10, paddingVertical: 18 },
  tab: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  tabActive: { backgroundColor: "#116B62" },
  tabInactive: { backgroundColor: "#EDF4F1" },
  tabText: { fontWeight: "900" },
  tabTextActive: { color: "#FFFFFF" },
  tabTextInactive: { color: "#116B62" },
  searchRow: { marginBottom: 10 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#1F2C2B", fontWeight: "600", fontSize: 15 },
  filterChips: { gap: 8, paddingBottom: 12 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#EDF4F1",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#116B62",
    borderColor: "#116B62",
  },
  filterChipText: { color: "#116B62", fontWeight: "700", fontSize: 13 },
  filterChipTextActive: { color: "#FFFFFF" },
  center: { paddingVertical: 40, alignItems: "center" },
  list: { gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "900", color: "#1F2C2B" },
  cardMeta: { marginTop: 4, color: "#6F7D7A", fontWeight: "700" },
  cardDetail: { marginTop: 2, color: "#A3B0AC", fontWeight: "600", fontSize: 13 },
  secondaryButton: {
    alignSelf: "flex-start",
    borderRadius: 12,
    backgroundColor: "#EEF7F3",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonHighlight: {
    backgroundColor: "#116B62",
  },
  secondaryButtonText: { color: "#116B62", fontWeight: "900" },
  secondaryButtonTextHighlight: { color: "#FFFFFF" },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusGood: { backgroundColor: "#DFF4E8" },
  statusWarn: { backgroundColor: "#FFF0CB" },
  statusBad: { backgroundColor: "#FDECEA" },
  statusNeutral: { backgroundColor: "#EDF4F1" },
  statusText: { color: "#2C3735", fontWeight: "900", fontSize: 12 },
  emptyState: { paddingVertical: 32, alignItems: "center" },
  emptyStateText: { color: "#A3B0AC", fontWeight: "700" },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#F5F9F7",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E1EAE6",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#1F2C2B" },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { padding: 20, gap: 24 },
  detailSection: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 16,
    overflow: "hidden",
  },
  detailSectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#EDF4F1",
    fontWeight: "900",
    color: "#1F2C2B",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F5F3",
  },
  detailLabel: { color: "#6F7D7A", fontWeight: "700", fontSize: 14, flex: 1 },
  detailValue: {
    color: "#1F2C2B",
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
    textAlign: "right",
  },
  detailEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#6F7D7A",
    fontWeight: "700",
  },
  itemBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F5F3",
  },
  itemBlockTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  itemTitle: {
    flex: 1,
    color: "#1F2C2B",
    fontSize: 15,
    fontWeight: "900",
  },
});
