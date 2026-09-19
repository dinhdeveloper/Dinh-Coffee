import { useState } from "react";
import { Box, Icon, Page, Text, useNavigate } from "zmp-ui";

const SUPPORT_NAME = "Trần Cảnh Dinh";
const SUPPORT_PHONE = "0975469232";
const SUPPORT_PHONE_DISPLAY = "0975 469 232";

const FAQS = [
  {
    question: "Làm sao để đặt hàng trên BoomBerry?",
    answer:
      "Chọn món yêu thích, thêm vào giỏ hàng rồi vào mục Giỏ hàng để chọn địa chỉ giao và thanh toán qua ZaloPay.",
  },
  {
    question: "Tôi có thể thanh toán bằng cách nào?",
    answer:
      "Hiện tại đơn hàng được thanh toán qua ZaloPay ngay trong ứng dụng, hoặc quét mã QR để thanh toán tại cửa hàng.",
  },
  {
    question: "Đơn hàng của tôi giao trong bao lâu?",
    answer:
      "Thời gian giao hàng thường từ 20-40 phút tùy khu vực. Bạn có thể theo dõi trạng thái đơn tại mục Đơn hàng của tôi.",
  },
  {
    question: "Làm sao để huỷ hoặc đổi đơn hàng?",
    answer:
      "Nếu đơn chưa được xác nhận thanh toán, vui lòng liên hệ trực tiếp với chúng tôi qua số điện thoại bên dưới để được hỗ trợ nhanh nhất.",
  },
  {
    question: "Điểm thưởng dùng để làm gì?",
    answer:
      "Mỗi đơn hàng thành công sẽ được cộng điểm thưởng, tích luỹ để đổi ưu đãi trong những lần mua tiếp theo.",
  },
];

function HelpPage() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar"
      style={{
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* =========================
          HEADER
      ========================== */}
      <Box
        className="flex items-center gap-3"
        style={{
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px))",
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
          Trợ giúp & liên hệ
        </Text.Title>
      </Box>

      {/* =========================
          CONTACT CARD
      ========================== */}
      <Box className="mt-5 flex-none rounded-2xl border border-white/40 bg-white/15 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.07)] backdrop-blur-xl">
        <Box className="flex items-center gap-3">
          <Box className="flex h-12 w-12 flex-none items-center justify-center rounded-full btn-liquid text-xl text-white">
            💬
          </Box>
          <Box className="min-w-0 flex-1">
            <Text size="small" className="font-bold text-[#1a1a1a]">
              {SUPPORT_NAME}
            </Text>
            <Text size="xSmall" className="mt-0.5 text-gray-500">
              Hỗ trợ khách hàng BoomBerry
            </Text>
          </Box>
        </Box>

        <Box className="mt-4 flex gap-2.5">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border-0 btn-liquid py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
          >
            <Icon icon="zi-call" size={16} />
            Gọi {SUPPORT_PHONE_DISPLAY}
          </a>
          <a
            href={`https://zalo.me/${SUPPORT_PHONE}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3 text-sm font-semibold text-[#1a1a1a] transition-transform active:scale-[0.98]"
          >
            <Icon icon="zi-chat" size={16} />
            Chat Zalo
          </a>
        </Box>

        <Text size="xSmall" className="mt-3 text-center text-gray-400">
          Hỗ trợ từ 8:00 - 22:00 mỗi ngày
        </Text>
      </Box>

      {/* =========================
          FAQ
      ========================== */}
      <Box className="mt-6 flex-none">
        <Text.Title size="small" className="mb-3 font-bold text-[#1a1a1a]">
          Câu hỏi thường gặp
        </Text.Title>

        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <button
              key={faq.question}
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="mb-2.5 block w-full rounded-2xl border border-white/40 bg-white/15 p-3.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl"
            >
              <Box className="flex items-center justify-between gap-3">
                <Text size="small" className="font-bold text-[#2f2f2f]">
                  {faq.question}
                </Text>
                <Icon
                  icon={isOpen ? "zi-chevron-up" : "zi-chevron-down"}
                  size={16}
                  className="flex-none text-gray-400"
                />
              </Box>

              {isOpen && (
                <Text size="small" className="mt-2 text-gray-500">
                  {faq.answer}
                </Text>
              )}
            </button>
          );
        })}
      </Box>
    </Page>
  );
}

export default HelpPage;
