import { Page, Text, Box, Icon, useNavigate } from "zmp-ui";

function StoryPage() {
  const navigate = useNavigate();

  return (
    <Page className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar">
      <Box
        className="flex items-center gap-3"
        style={{
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 12px)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        <Text.Title size="normal">Mỗi ngày 1 câu chuyện</Text.Title>
      </Box>

      <Box className="mt-4 rounded-2xl border border-white/40 bg-white/10 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl">
        <Text className="text-sm leading-6 text-black/80">
          Cà phê ngon không chỉ là một thức uống — đó là khoảnh khắc đánh
          thức tâm trí và sưởi ấm tâm hồn bạn. Mỗi hạt cà phê đi qua một
          hành trình dài, từ những nông trại trên cao nguyên đầy nắng gió,
          qua bàn tay tỉ mỉ của người rang xay, để rồi hội tụ trong tách cà
          phê bạn cầm trên tay mỗi sáng.
        </Text>

        <Text className="mt-3 text-sm leading-6 text-black/80">
          Có người tìm đến cà phê để bắt đầu một ngày mới tràn đầy năng
          lượng, có người lại xem đó là khoảng lặng để suy ngẫm, trò
          chuyện cùng bạn bè hay đơn giản là ngồi một mình ngắm phố phường
          trôi qua khung cửa sổ.
        </Text>

        <Text className="mt-3 text-sm leading-6 text-black/80">
          Dù bạn thưởng thức cà phê theo cách nào, chúng tôi tin rằng mỗi
          tách cà phê đều mang trong mình một câu chuyện riêng — câu
          chuyện của hương vị, của con người, và của những khoảnh khắc
          đáng nhớ trong cuộc sống thường ngày.
        </Text>
      </Box>
    </Page>
  );
}

export default StoryPage;
