document.addEventListener('DOMContentLoaded', async () => {
    // Mini UI Logger
    const debugEl = document.getElementById('debug-console');
    const logs = [];
    const uiLog = (...args) => {
        if (!debugEl) return;
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        debugEl.innerHTML = logs.slice(-10).join('<br/>');
    };
    uiLog("Init Room Script...");

    // 1. Check Session Storage
    const bookingDataStr = sessionStorage.getItem('chonVillageBooking');
    if (!bookingDataStr) {
        window.location.href = 'index.html';
        return;
    }

    const bookingData = JSON.parse(bookingDataStr);

    // Parse dates reliably in local time
    const parseLocal = (dateStr) => {
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d);
    };

    const checkinDate = parseLocal(bookingData.checkin);
    const checkoutDate = parseLocal(bookingData.checkout);

    const adults = parseInt(bookingData.adults);
    const children = parseInt(bookingData.children);
    const childAgeVal = parseInt(bookingData.childrenAgeCategory) || 0;
    const isUnder6 = childAgeVal > 0 && childAgeVal < 6;

    // Formatting dates for display
    const formatDateObj = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
    document.getElementById('summary-dates').textContent = `${formatDateObj(checkinDate)} - ${formatDateObj(checkoutDate)}`;

    let summaryGuestsStr = `${adults} Người lớn`;
    if (children > 0) summaryGuestsStr += `, ${children} Trẻ em`;
    document.getElementById('summary-guests').textContent = summaryGuestsStr;

    const roomsContainer = document.getElementById('rooms-container');
    roomsContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center space-y-4 my-16 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
            <span class="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></span>
            <p class="text-center text-primary font-display italic text-lg">Chồn is preparing the room...</p>
        </div>
    `;

    // 2. Database Definition
    const localRooms = [
        {
            id: "Pink_Room",
            name: "Pink Room",
            area: "25m²",
            amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Quạt", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"],
            special: null,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBszIcCOa0CWCjss_MP7upd5ntyeuZlNd-qy-EVWN3lr9UhgBanAIi5CS96RMkxee6wi8pmpkosErLjHaQG6gLsd98cYpgj5MN4VbhX8enol2tp16CGha9-8P-9f8dSXQYh8xiWNmWw8ymCT6-wcVdOyJL6QfHCqMU7_FT8y53sViQLbQaPm-2-_E8KjE_r2LF9msyNp1RO-QN-jT3fhMRCrvfA5m1Jc3YB6ZvrxWrYHlgrqrKpdidORn0b6lYApuJqMGjiX15Q4b7B"
        },
        {
            id: "Gray_Room",
            name: "Gray Room",
            area: "25m²",
            amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Điều hòa", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"],
            special: null,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcfj5Vam2igQsoTthQBKHEzAW_Av7L7uswzyXzkjj5YMDOWsSjcjB-7pD3y9GF-Hcezj9x_szQYjEvNS0ugmC4cc8pE7eni27E88bykrPKZEblrDB7KW39L-Qvq6UGHKoejrIgci7wj_iJeZLhbBP4T8XshGBiVns3aUA4f5hFH2F1lzsD8fwrvcr-lZ-_WhCZmZvpjeSDhLXWEPIPcb2w8Ah5i-88SWkqVVUa1utiB3vfCUw9lHSPOJ2uzC_iokcz4s48CLGkcQRP"
        },
        {
            id: "Green_Room",
            name: "Green Room",
            area: "25m²",
            amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Máy lạnh", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"],
            special: "Lựa chọn lý tưởng cho trẻ dưới 6 tuổi",
            img: "https://plus.unsplash.com/premium_photo-1678297270385-ad5067126607?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: "Black_Room",
            name: "Black Room",
            area: "32m²",
            amenities: ["TV 65 inch kết nối Netflix, YouTube,...", "Máy lạnh", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"],
            special: null,
            img: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: "White_Room",
            name: "White Room",
            area: "33m²",
            amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Máy lạnh", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"],
            special: null,
            img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: "Gold_Room",
            name: "Gold Room",
            area: "33m²",
            amenities: ["Bồn cầu điện", "Sưởi khăn tắm", "TV 55 inch kết nối Netflix, YouTube,...", "Máy lạnh", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"],
            special: "Có sân vườn, bếp riêng",
            img: "https://images.unsplash.com/photo-1582719478250-c894e4dc240e?q=80&w=600&auto=format&fit=crop"
        }
    ];

    // 3. Fetch Google Sheets Data
    const URL_PRICINGS = [
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=2054490170',
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=1006162975',
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=583502511', // T5
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=1084259420', // T6
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=1502542719', // T7
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=1606229783', // T8
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=489054922',  // T9
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=616215486',  // T10
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=222250592',  // T11
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=1120714568'  // T12
    ];
    const URL_SCHEDULES = [
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=1441677072',
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=2011761073',
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=1564983873', // T5
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=1882992325', // T6
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=682502335',  // T7
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=926390804',  // T8
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=382926038',  // T9
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=1549710105', // T10
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=654600068',  // T11
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=1543178625'  // T12
    ];

    try {
        const fetchJSONP = (url) => new Promise((resolve) => {
            const cbName = 'gvizCb_' + Date.now() + Math.floor(Math.random() * 10000);

            const timeout = setTimeout(() => {
                delete window[cbName];
                console.warn("Timeout fetching Google Sheet: ", url);
                resolve(null); // Resolve with null instead of aborting everything
            }, 7000); // 7 seconds timeout

            window[cbName] = (res) => {
                clearTimeout(timeout);
                delete window[cbName];
                if (s.parentNode) document.head.removeChild(s);
                resolve(res);
            };

            const s = document.createElement('script');
            s.src = url + '&tqx=out:json;responseHandler:' + cbName;
            s.onerror = () => {
                clearTimeout(timeout);
                console.warn("Error loading Google Sheet script: ", url);
                resolve(null);
            };
            document.head.appendChild(s);
        });

        const pricingPromises = URL_PRICINGS.map(url => fetchJSONP(url));
        const schedulePromises = URL_SCHEDULES.map(url => fetchJSONP(url));

        const [...allResponses] = await Promise.all([
            ...pricingPromises,
            ...schedulePromises
        ]);

        const numPricing = URL_PRICINGS.length;
        const pricingResponses = allResponses.slice(0, numPricing);
        const scheduleResponses = allResponses.slice(numPricing);

        // Check if AT LEAST ONE of the links succeeded for both Pricing and Schedule
        const validPricing = pricingResponses.filter(res => res && res.table);
        const validSchedule = scheduleResponses.filter(res => res && res.table);

        if (validSchedule.length === 0) {
            throw new Error("Proxy returned invalid HTML or no data instead of JSONP for Schedule links");
        }

        // Parse Pricing and Schedule
        console.log("Pricing JSONs received", pricingResponses);
        console.log("Schedule JSONs received", scheduleResponses);

        const scheduleData = {};
        const pricingData = {}; // Format: { "2026-03": { "Pink_Room": { weekday: 700k, weekend: 800k } } }

        scheduleResponses.forEach((scheduleRes, index) => {
            if (!scheduleRes || !scheduleRes.table || !scheduleRes.table.rows) return;

            // Lấy tháng tương ứng từ tab Lịch (ví dụ "2026-03")
            let monthKey = null;

            scheduleRes.table.rows.forEach(row => {
                if (!row.c || row.c.length < 3) return;
                const val = row.c[0] ? row.c[0].v : null;
                const formatted = row.c[0] ? row.c[0].f : null;
                const rId = row.c[1] ? row.c[1].v : null;
                const status = row.c[2] ? row.c[2].v : null;

                if (!val || !rId || !status) return;

                let dateStr = "";
                if (typeof val === 'string' && val.startsWith('Date(')) {
                    // Extract Y, M, D from "Date(2026,2,1)"
                    const parts = val.substring(5, val.length - 1).split(',');
                    const y = parseInt(parts[0]);
                    const m = parseInt(parts[1]); // Google month is 0-indexed!
                    const d = parseInt(parts[2]);
                    dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                } else {
                    dateStr = String(formatted || val).trim();
                }

                const cleanRid = String(rId).trim();

                if (!monthKey && dateStr.length >= 7) {
                    monthKey = dateStr.substring(0, 7); // Trích xuất "YYYY-MM"
                }

                if (!scheduleData[cleanRid]) scheduleData[cleanRid] = {};
                scheduleData[cleanRid][dateStr] = String(status).trim();
            });

            // Map bảng giá tương ứng vào tháng vừa lấy được
            if (monthKey && pricingResponses[index]) {
                const pRes = pricingResponses[index];
                if (!pricingData[monthKey]) pricingData[monthKey] = {};

                if (pRes.table && pRes.table.rows) {
                    pRes.table.rows.forEach(row => {
                        if (!row.c || row.c.length < 6) return;
                        const roomId = row.c[0] ? row.c[0].v : null;
                        if (!roomId) return;

                        const getPrice = (cell) => {
                            if (!cell) return 0;
                            if (cell.v !== undefined && typeof cell.v === 'number') return cell.v;
                            if (cell.f) return parseInt(cell.f.replace(/\./g, '')) || 0;
                            return parseInt(String(cell.v).replace(/\./g, '')) || 0;
                        };

                        pricingData[monthKey][roomId.trim()] = {
                            weekday: getPrice(row.c[4]),
                            weekend: getPrice(row.c[5])
                        };
                    });
                }
            }
        });

        uiLog("Pricing links valid:", validPricing.length);
        uiLog("Schedule links valid:", validSchedule.length);
        console.log("Parsed Pricing Data Payload:\n", pricingData);
        console.log("Merged Schedule Data Payload:\n", scheduleData);

        // Helper to loop dates (Checkin inclusive, Checkout exclusive)
        const datesToStay = [];
        let curr = new Date(checkinDate);
        while (curr < checkoutDate) {
            datesToStay.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        // Logic formatting string YYYY-MM-DD
        const getStr = (d) => {
            const tz = d.getTimezoneOffset() * 60000;
            return (new Date(d - tz)).toISOString().split('T')[0];
        };

        const renderCurrency = (num) => new Intl.NumberFormat('vi-VN').format(num);

        let allowedRooms = localRooms;
        if (children > 0 && isUnder6) {
            // Nếu khách chọn có trẻ em và dưới 6 tuổi thì chỉ hiển thị phòng xanh
            allowedRooms = localRooms.filter(r => r.id === 'Green_Room');
        } else {
            // Còn trên 6 tuổi (hoặc không có) thì dựa vào lịch phòng phòng nào còn trống thì hiển thị
            allowedRooms = localRooms;
        }

        roomsContainer.innerHTML = '';
        renderRooms(allowedRooms, scheduleData, pricingData, datesToStay);

    } catch (err) {
        uiLog("CATCH ERROR:", err.message, err.stack);
        console.error("Lỗi khi tải dữ liệu Google Sheets", err);
        alert("Có lỗi kết nối hệ thống phòng: " + err.message);
        roomsContainer.innerHTML = '<p class="text-center text-amber-600 mb-4 bg-amber-50 rounded p-3">Không thể kết nối với dữ liệu phòng theo thời gian thực. Đang hiển thị danh sách phòng tiêu chuẩn.</p>';

        // Fallback Pricing Data
        const fallbackPricingData = {
            'default': {
                'Pink_Room': { weekday: 700000, weekend: 800000 },
                'Gray_Room': { weekday: 900000, weekend: 1000000 },
                'Green_Room': { weekday: 1000000, weekend: 1100000 },
                'Black_Room': { weekday: 1100000, weekend: 1200000 },
                'White_Room': { weekday: 1200000, weekend: 1300000 },
                'Gold_Room': { weekday: 1600000, weekend: 1600000 }
            }
        };

        let fallbackAllowedRooms = localRooms;
        if (children > 0 && isUnder6) {
            fallbackAllowedRooms = localRooms.filter(r => r.id === 'Green_Room');
        } else {
            fallbackAllowedRooms = localRooms;
        }

        const datesToStay = [];
        let curr = new Date(checkinDate);
        while (curr < checkoutDate) {
            datesToStay.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        // Render with fallback data and empty schedule (assuming everything is available)
        renderRooms(fallbackAllowedRooms, {}, fallbackPricingData, datesToStay);
    }

    // Logic formatting string YYYY-MM-DD
    function getStr(d) {
        const tz = d.getTimezoneOffset() * 60000;
        return (new Date(d - tz)).toISOString().split('T')[0];
    }

    function renderCurrency(num) {
        return new Intl.NumberFormat('vi-VN').format(num);
    }

    function renderRooms(roomsList, scheduleData, pricingData, datesToStay) {
        roomsList.forEach(room => {
            // Assess Availability and Calculate Price
            let isAvailable = true;
            let firstNightWeekday = 0;
            let firstNightWeekend = 0;
            let finalPriceToPass = 0;

            // 1. Check if room is available for ALL days
            for (const date of datesToStay) {
                const dateStr = getStr(date);
                if (scheduleData[room.id] && scheduleData[room.id][dateStr] === 'Booked') {
                    isAvailable = false;
                }
            }

            // 2. Calculate the price of the FIRST night only to establish the base rate card
            if (datesToStay.length > 0) {
                const firstDate = datesToStay[0];
                const dateStr = getStr(firstDate);
                const dayOfWeek = firstDate.getDay();
                const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0);
                const monthKey = dateStr.substring(0, 7);

                const currentMonthPricing = pricingData[monthKey] || pricingData['default'];

                if (currentMonthPricing && currentMonthPricing[room.id]) {
                    firstNightWeekday = currentMonthPricing[room.id].weekday;
                    firstNightWeekend = currentMonthPricing[room.id].weekend;
                } else {
                    const fallbackMonth = Object.keys(pricingData).find(m => pricingData[m] && pricingData[m][room.id]);
                    if (fallbackMonth) {
                        firstNightWeekday = pricingData[fallbackMonth][room.id].weekday;
                        firstNightWeekend = pricingData[fallbackMonth][room.id].weekend;
                    } else {
                        uiLog("Missing price for", room.id);
                        firstNightWeekday = 800000;
                        firstNightWeekend = 1000000;
                    }
                }

                finalPriceToPass = isWeekend ? firstNightWeekend : firstNightWeekday;
            }

            // Nếu phòng đã bị đặt thì bỏ qua, không in ra màn hình
            if (!isAvailable) return;

            // Build Room Card HTML
            const specialAttrHtml = room.special ? `
                <div class="bg-primary/10 border border-primary/20 rounded p-2 mb-4">
                    <p class="text-[11px] text-primary font-bold flex items-center gap-1 italic">
                        <span class="material-symbols-outlined text-sm">child_care</span>
                        ${room.special}
                    </p>
                </div>
            ` : '';

            const amenitiesHtml = room.amenities.map(am => `
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-xl text-primary">done</span>
                    <span>${am}</span>
                </div>
            `).join('');

            const badgeHtml = isAvailable
                ? `<div class="absolute top-4 left-4 bg-primary/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Có sẵn</div>`
                : `<div class="absolute top-4 left-4 bg-slate-400 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Hết phòng</div>`;

            const priceHtml = isAvailable
                ? `<div class="flex flex-col gap-0.5 -ml-3">
                    <p class="text-[11px] text-slate-400 uppercase tracking-tight mb-1">Giá Niêm Yết</p>
                    <div class="flex items-baseline gap-1 whitespace-nowrap">
                        <span class="text-[15px] font-bold text-graphite leading-none">${renderCurrency(firstNightWeekday)}</span>
                        <span class="text-[12px] font-normal text-slate-500">/ Đêm Trong Tuần (T2 Đến T5)</span>
                    </div>
                    <div class="flex items-baseline gap-1 whitespace-nowrap">
                        <span class="text-[15px] font-bold text-graphite leading-none">${renderCurrency(firstNightWeekend)}</span>
                        <span class="text-[12px] font-normal text-slate-500">/ Đêm Cuối Tuần (T6 Đến CN)</span>
                    </div>
                   </div>
                   <button onclick='selectRoom(this, ${JSON.stringify({ id: room.id, name: room.name, img: room.img, totalPrice: finalPriceToPass })})' class="bg-primary hover:bg-gradient-to-r hover:from-[#C8A96A] hover:via-[#E8D399] hover:to-[#C8A96A] hover:text-graphite text-white font-display italic tracking-wider font-bold text-[14px] pt-0.5 pb-1 px-3 rounded shadow-lg shadow-primary/20 active:scale-95 transition-all duration-500 flex flex-col items-center justify-center leading-[1.1] shrink-0 mt-[22px] -mr-3">
                       <span>Thêm</span>
                       <span>Phòng</span>
                   </button>`
                : `<div class="flex flex-col gap-0.5 opacity-50 -ml-3">
                    <p class="text-[11px] text-slate-400 uppercase tracking-tight mb-1">Giá Niêm Yết</p>
                    <div class="flex items-baseline gap-1 whitespace-nowrap">
                        <span class="text-[15px] font-bold text-slate-400 line-through leading-none">${renderCurrency(firstNightWeekday)}</span>
                        <span class="text-[12px] font-normal text-slate-500">/ Đêm Trong Tuần (T2 Đến T5)</span>
                    </div>
                    <div class="flex items-baseline gap-1 whitespace-nowrap">
                        <span class="text-[15px] font-bold text-slate-400 line-through leading-none">${renderCurrency(firstNightWeekend)}</span>
                        <span class="text-[12px] font-normal text-slate-500">/ Đêm Cuối Tuần (T6 Đến CN)</span>
                    </div>
                   </div>
                   <button disabled class="bg-slate-200 text-slate-400 font-bold text-[14px] pt-0.5 pb-1 px-3 rounded cursor-not-allowed flex flex-col items-center justify-center leading-[1.1] shrink-0 mt-[22px] -mr-3">
                       <span>Hết</span>
                       <span>Phòng</span>
                   </button>`;

            const card = document.createElement('div');
            card.className = "rococo-border bg-white shadow-sm overflow-hidden group scroll-animate-card";

            card.innerHTML = `
                <div class="acanthus-corner top-0 left-0">
                    <svg fill="currentColor" viewbox="0 0 24 24"><path d="M2,2 L10,2 C6,2 2,6 2,10 L2,2 Z"></path></svg>
                </div>
                <div class="acanthus-corner top-0 right-0 rotate-90">
                    <svg fill="currentColor" viewbox="0 0 24 24"><path d="M2,2 L10,2 C6,2 2,6 2,10 L2,2 Z"></path></svg>
                </div>
                <div class="relative h-56 overflow-hidden border-4 border-double border-primary/60 m-2 rounded-sm">
                    <img alt="${room.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="${room.img}"/>
                    ${badgeHtml}
                </div>
                <div class="px-5 pb-5 pt-0">
                    <div class="flex justify-between items-start mb-0 -mt-1">
                        <h3 class="font-display text-2xl font-bold text-graphite">${room.name}</h3>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-0 text-sm text-slate-500">
                        <div class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-xl text-primary">square_foot</span>
                            <span>${room.area}</span>
                        </div>
                        ${amenitiesHtml}
                    </div>
                    ${specialAttrHtml}
                    <div class="flex items-center justify-between pt-2 mt-1">
                        ${priceHtml}
                    </div>
                </div>
            `;
            roomsContainer.appendChild(card);
        });

        // Tích hợp Intersection Observer để tạo hiệu ứng scroll
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1 // Kích hoạt khi 10% thẻ hiển thị trên màn hình
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Thêm class is-visible để chạy CSS Animation
                    entry.target.classList.add('is-visible');
                    // Ngừng quan sát sau khi đã hiển thị để không lặp lại animation khi cuộn lên xuống nhiều lần (tuỳ chọn)
                    // observer.unobserve(entry.target);
                } else {
                    // Xoá class đi nếu muốn hiệu ứng lặp lại mỗi khi cuộn qua
                    entry.target.classList.remove('is-visible');
                }
            });
        }, observerOptions);

        // Đăng ký quan sát tất cả các thẻ phòng
        document.querySelectorAll('.scroll-animate-card').forEach(card => {
            observer.observe(card);
        });

        // Nếu tất cả phòng đều bị ẩn (hết phòng hoàn toàn trong các ngày đã chọn)
        const availableRoomsMessage = document.getElementById('available-rooms-message');
        if (roomsContainer.children.length === 0) {
            if (availableRoomsMessage) {
                availableRoomsMessage.classList.add('hidden');
            }
            roomsContainer.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center space-y-4 my-16">
                    <span class="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
                    <p class="text-center text-[#c8a96a] font-display italic text-xl">Ngày mà bạn chọn đã hết phòng, xin vui lòng đổi ngày khác.</p>
                </div>
            `;
        } else {
            if (availableRoomsMessage) {
                availableRoomsMessage.classList.remove('hidden');
            }
        }
    }

    // Cập nhật giao diện modal chỉnh sửa booking
    const modal = document.getElementById('edit-booking-modal');
    const modalContent = document.getElementById('edit-booking-content');
    const summaryBar = document.getElementById('summary-bar');

    const checkinInput = document.getElementById('modal-checkin');
    const checkoutInput = document.getElementById('modal-checkout');
    const adultCountSpan = document.getElementById('modal-adult-count');
    const childCountSpan = document.getElementById('modal-child-count');
    const childrenAgeInput = document.getElementById('modal-children-age');

    let adultCountLocal = adults || 2;
    let childCountLocal = children || 0;

    // Setup dates constraint (min today)
    const today = new Date().toISOString().split('T')[0];
    if (checkinInput && checkoutInput) {
        checkinInput.min = today;

        checkinInput.addEventListener('change', () => {
            if (checkinInput.value) {
                const ciDate = new Date(checkinInput.value);
                const nextDay = new Date(ciDate);
                nextDay.setDate(nextDay.getDate() + 1);
                checkoutInput.min = nextDay.toISOString().split('T')[0];

                if (checkoutInput.value && new Date(checkoutInput.value) <= ciDate) {
                    checkoutInput.value = nextDay.toISOString().split('T')[0];
                }
            }
        });
    }

    const updateGuestDisplay = () => {
        if (adultCountSpan) adultCountSpan.textContent = adultCountLocal;
        if (childCountSpan) childCountSpan.textContent = childCountLocal;

        if (childCountLocal > 0) {
            if (childrenAgeInput) childrenAgeInput.classList.remove('hidden');
        } else {
            if (childrenAgeInput) {
                childrenAgeInput.classList.add('hidden');
                childrenAgeInput.value = "";
            }
        }
    };

    const minusAdult = document.getElementById('modal-minus-adult');
    if (minusAdult) minusAdult.addEventListener('click', () => {
        if (adultCountLocal > 1) {
            adultCountLocal--;
            updateGuestDisplay();
        }
    });

    const plusAdult = document.getElementById('modal-plus-adult');
    if (plusAdult) plusAdult.addEventListener('click', () => {
        adultCountLocal++;
        updateGuestDisplay();
    });

    const minusChild = document.getElementById('modal-minus-child');
    if (minusChild) minusChild.addEventListener('click', () => {
        if (childCountLocal > 0) {
            childCountLocal--;
            updateGuestDisplay();
        }
    });

    const plusChild = document.getElementById('modal-plus-child');
    if (plusChild) plusChild.addEventListener('click', () => {
        childCountLocal++;
        updateGuestDisplay();
    });

    const openModal = () => {
        if (checkinInput) checkinInput.value = bookingData.checkin;
        if (checkoutInput) checkoutInput.value = bookingData.checkout;

        adultCountLocal = parseInt(bookingData.adults) || 2;
        childCountLocal = parseInt(bookingData.children) || 0;

        if (childrenAgeInput) childrenAgeInput.value = bookingData.childrenAgeCategory || "";

        if (checkinInput && checkinInput.value) {
            const ciDate = new Date(checkinInput.value);
            const nextDay = new Date(ciDate);
            nextDay.setDate(nextDay.getDate() + 1);
            if (checkoutInput) checkoutInput.min = nextDay.toISOString().split('T')[0];
        }

        updateGuestDisplay();

        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // Trigger reflow
            void modal.offsetWidth;
            modal.classList.remove('opacity-0');
            if (modalContent) modalContent.classList.remove('translate-y-full');
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.classList.add('opacity-0');
            if (modalContent) modalContent.classList.add('translate-y-full');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 300);
        }
    };

    if (summaryBar) summaryBar.addEventListener('click', openModal);

    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const ci = checkinInput ? checkinInput.value : '';
            const co = checkoutInput ? checkoutInput.value : '';
            const ad = adultCountLocal;
            const ch = childCountLocal;
            const age = childrenAgeInput ? childrenAgeInput.value : '';

            if (!ci || !co) {
                alert("Vui lòng chọn ngày nhận và trả phòng");
                return;
            }

            const ciDate = new Date(ci);
            const coDate = new Date(co);
            if (ciDate >= coDate) {
                alert("Ngày trả phòng phải sau ngày nhận phòng");
                return;
            }

            if (ch > 0 && !age) {
                alert("Vui lòng chọn độ tuổi của trẻ em");
                return;
            }

            const updatedBooking = {
                ...bookingData,
                checkin: ci,
                checkout: co,
                adults: ad,
                children: ch,
                childrenAgeCategory: age
            };

            sessionStorage.setItem('chonVillageBooking', JSON.stringify(updatedBooking));
            window.location.reload();
        });
    }

});

// Global function callback for inline onclick
window.selectRoom = function (btn, roomData) {
    btn.textContent = "Đang xử lý...";
    sessionStorage.setItem('chonVillageSelectedRoom', JSON.stringify(roomData));
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 300);
};
