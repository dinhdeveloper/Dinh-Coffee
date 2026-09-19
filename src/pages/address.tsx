import { useEffect, useState } from "react";
import { Box, Icon, Page, Text, useNavigate, useSnackbar } from "zmp-ui";
import {
  AddressInput,
  DeliveryAddress,
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from "@/services/address";
import {
  getStoredZaloUser,
  requestZaloProfile,
  ZALO_AUTH_CHANGED_EVENT,
  type ZaloAuthUser,
} from "@/services/zalo-auth";

type FormState = AddressInput & { id?: string };

const EMPTY_FORM: FormState = { receiver: "", phone: "", detail: "", note: "" };

function AddressPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();

  const [user, setUser] = useState<ZaloAuthUser | null>(() =>
    getStoredZaloUser(),
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showMessage = (text: string, type: "success" | "error") =>
    openSnackbar({ text, type, position: "top" });

  useEffect(() => {
    const syncUser = () => setUser(getStoredZaloUser());
    window.addEventListener(ZALO_AUTH_CHANGED_EVENT, syncUser);
    return () => window.removeEventListener(ZALO_AUTH_CHANGED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchAddresses(user.id)
      .then((data) => {
        if (!cancelled) setAddresses(data);
      })
      .catch(() => {
        if (!cancelled) showMessage("Không tải được danh sách địa chỉ", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    try {
      const nextUser = await requestZaloProfile();
      setUser(nextUser);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Không đăng nhập được Zalo:", error);
      showMessage("Không thể đăng nhập, vui lòng thử lại.", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenAdd = () => {
    setError(null);
    setForm(EMPTY_FORM);
  };

  const handleOpenEdit = (address: DeliveryAddress) => {
    setError(null);
    setForm({
      id: address.id,
      receiver: address.receiver,
      phone: address.phone,
      detail: address.detail,
      note: address.note,
    });
  };

  const handleSaveForm = async () => {
    if (!form || !user || saving) return;

    if (!form.receiver.trim() || !form.phone.trim() || !form.detail.trim()) {
      setError("Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const input: AddressInput = {
        receiver: form.receiver.trim(),
        phone: form.phone.trim(),
        detail: form.detail.trim(),
        note: form.note?.trim() || undefined,
      };

      if (form.id) {
        const updated = await updateAddress(user.id, form.id, input);
        setAddresses((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a)),
        );
      } else {
        const created = await createAddress(user.id, input);
        setAddresses((prev) => [...prev, created]);
      }

      setForm(null);
      showMessage("Đã lưu địa chỉ giao hàng.", "success");
    } catch (err) {
      setError("Không lưu được địa chỉ, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      await deleteAddress(user.id, id);
      setAddresses(await fetchAddresses(user.id));
      showMessage("Đã xoá địa chỉ.", "success");
    } catch {
      showMessage("Không xoá được địa chỉ, vui lòng thử lại", "error");
    }
  };

  const handleSelect = async (id: string) => {
    if (!user) return;

    const previous = addresses;
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    );

    try {
      await setDefaultAddress(user.id, id);
    } catch {
      setAddresses(previous);
      showMessage("Không đổi được địa chỉ mặc định", "error");
    }
  };

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar"
      style={{
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <Box
        className="flex items-center gap-3"
        style={{
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 2px)",
        }}
      >
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        <Text.Title size="normal" className="truncate font-bold">
          Địa chỉ giao hàng
        </Text.Title>
      </Box>

      {!user ? (
        <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Icon icon="zi-location" size={30} className="text-gray-400" />
          </Box>
          <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
            Đăng nhập để quản lý địa chỉ
          </Text.Title>
          <Text size="small" className="text-gray-500">
            Địa chỉ sẽ được lưu theo tài khoản Zalo của bạn
          </Text>
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="mt-2 rounded-full border-0 btn-liquid px-6 py-3 text-sm font-medium text-white active:scale-95 disabled:opacity-80"
          >
            {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập với Zalo"}
          </button>
        </Box>
      ) : loading ? (
        <Box className="mt-5 flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Box key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </Box>
      ) : (
        <>
          {addresses.length === 0 ? (
            <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
              <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Icon icon="zi-location" size={30} className="text-gray-400" />
              </Box>
              <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
                Chưa có địa chỉ nào
              </Text.Title>
              <Text size="small" className="text-gray-500">
                Thêm địa chỉ để đặt hàng nhanh hơn
              </Text>
            </Box>
          ) : (
            <Box className="mt-5 flex flex-col gap-3">
              {addresses.map((address) => (
                <Box
                  key={address.id}
                  onClick={() => handleSelect(address.id)}
                  className={`cursor-pointer rounded-2xl border p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-colors ${
                    address.isDefault
                      ? "border-[#006AF5] bg-white"
                      : "border-transparent bg-white/70 backdrop-blur-xl"
                  }`}
                >
                  <Box className="flex items-start gap-3">
                    <Box
                      className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                        address.isDefault
                          ? "border-[#006AF5] btn-liquid"
                          : "border-gray-300"
                      }`}
                    >
                      {address.isDefault && (
                        <Icon icon="zi-check" size={12} className="text-white" />
                      )}
                    </Box>

                    <Box className="min-w-0 flex-1">
                      <Box className="flex items-center gap-2">
                        <Text size="small" className="font-bold text-[#1a1a1a]">
                          {address.receiver}
                        </Text>
                        {address.isDefault && (
                          <Text
                            size="xxSmall"
                            className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-500"
                          >
                            Mặc định
                          </Text>
                        )}
                      </Box>
                      <Text size="small" className="mt-0.5 text-gray-500">
                        {address.phone}
                      </Text>
                      <Text size="small" className="mt-0.5 text-gray-500">
                        {address.detail}
                      </Text>
                      {address.note && (
                        <Text size="xSmall" className="mt-1 text-gray-400">
                          Ghi chú: {address.note}
                        </Text>
                      )}
                    </Box>

                    <Box className="flex flex-none items-center gap-1">
                      <button
                        type="button"
                        aria-label="Sửa"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(address);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-gray-100 p-0 text-gray-500 active:scale-90"
                      >
                        <Icon icon="zi-edit" size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Xoá"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(address.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-gray-100 p-0 text-red-500 active:scale-90"
                      >
                        <Icon icon="zi-delete" size={16} />
                      </button>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-0 btn-liquid py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
          >
            <Icon icon="zi-plus" size={16} />
            Thêm địa chỉ mới
          </button>
        </>
      )}

      {form &&
        (() => {
          const currentForm = form;
          return (
            <Box className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50">
              <Box
                className="w-full max-w-md rounded-t-3xl bg-white p-5"
                style={{
                  paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
                }}
              >
                <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
                  {currentForm.id ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
                </Text.Title>

                <Box className="mt-4 flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Họ và tên người nhận"
                    value={currentForm.receiver}
                    onChange={(e) =>
                      setForm({ ...currentForm, receiver: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
                  />
                  <input
                    type="tel"
                    placeholder="Số điện thoại"
                    value={currentForm.phone}
                    onChange={(e) =>
                      setForm({ ...currentForm, phone: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
                  />
                  <input
                    type="text"
                    placeholder="Địa chỉ nhận hàng (số nhà, đường, phường/xã...)"
                    value={currentForm.detail}
                    onChange={(e) =>
                      setForm({ ...currentForm, detail: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
                  />
                  <input
                    type="text"
                    placeholder="Ghi chú (không bắt buộc)"
                    value={currentForm.note}
                    onChange={(e) =>
                      setForm({ ...currentForm, note: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
                  />
                </Box>

                {error && (
                  <Text size="small" className="mt-3 text-red-500">
                    {error}
                  </Text>
                )}

                <button
                  type="button"
                  onClick={handleSaveForm}
                  disabled={saving}
                  className="mt-4 w-full rounded-full border-0 btn-liquid py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-80"
                >
                  {saving ? "Đang lưu..." : "Lưu địa chỉ"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="mt-2 w-full rounded-full border-0 bg-transparent py-2.5 text-sm font-medium text-gray-400 active:opacity-60"
                >
                  Huỷ
                </button>
              </Box>
            </Box>
          );
        })()}
    </Page>
  );
}

export default AddressPage;
