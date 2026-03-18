document.addEventListener('DOMContentLoaded', () => {
    // DIAGNOSTIC VERSION: v2.2-relative
    console.log(">>> [DIAG] Checkout v2.2-relative started");
    
    // Server Diagnostics Check (Relative Path)
    fetch('/diagnostics').then(r => r.json()).then(d => {
        console.log(">>> [DIAG] Diagnostics:", d);
        if (d.keys && (!d.keys.clientId || !d.keys.apiKey || !d.keys.checksumKey)) {
            alert("THÔNG BÁO: Cấu hình PayOS trên Render bị thiếu (Environment Variables).");
        }
    }).catch(e => console.warn(">>> [DIAG] Diagnostics failed:", e));

    const renderCurrency = (num) => new Intl.NumberFormat('vi-VN').format(num) + 'đ';
    const setSafeText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // 1. Retrieve State
    const urlParams = new URLSearchParams(window.location.search);
    const isPaidOnLoad = (urlParams.get('status') || '').toUpperCase() === 'PAID';
    const bookingData = JSON.parse(sessionStorage.getItem('chonVillageBooking') || '{}');
    const roomsData = JSON.parse(sessionStorage.getItem('chonVillageSelectedRooms') || sessionStorage.getItem('chonVillageSelectedRoom') || '[]');
    const adultsCount = parseInt(bookingData.adults) || 2;

    if (!isPaidOnLoad && (!bookingData.checkin || (Array.isArray(roomsData) ? roomsData.length === 0 : !roomsData.name))) {
        window.location.href = 'index.html';
        return;
    }

    // 2. Calculations
    const parseLocal = (s) => { if(!s) return new Date(); const [y,m,d]=s.split('-'); return new Date(y,m-1,d); };
    const checkinDate = parseLocal(bookingData.checkin);
    const checkoutDate = parseLocal(bookingData.checkout);
    const nights = Math.max(1, Math.ceil(Math.abs(checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)));
    const formatDateObj = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    let baseRoomTotal = 0;
    const surchargeRates = [];
    (Array.isArray(roomsData) ? roomsData : [roomsData]).forEach(r => {
        baseRoomTotal += (parseInt(r.baseRoomTotal) || 0);
        surchargeRates.push(parseInt(r.surcharge) || 450000);
    });

    const extraGuestsCount = Math.max(0, adultsCount - ((Array.isArray(roomsData) ? roomsData.length : 1) * 2));
    const sortedRates = [...surchargeRates].sort((a, b) => a - b);
    let totalSurchargePerNight = 0;
    if (roomsData.length === 3) {
        if (extraGuestsCount === 1) totalSurchargePerNight = (new Set(sortedRates).size === 3) ? sortedRates[1] : sortedRates[0];
        else if (extraGuestsCount === 2) totalSurchargePerNight = sortedRates[0] + sortedRates[1];
        else for (let i = 0; i < extraGuestsCount; i++) totalSurchargePerNight += sortedRates[i] || sortedRates[0];
    } else {
        for (let i = 0; i < extraGuestsCount; i++) totalSurchargePerNight += sortedRates[i] || sortedRates[0];
    }

    const grandTotalAmount = baseRoomTotal + (totalSurchargePerNight * nights);
    const depositAmount = Math.floor(grandTotalAmount / 2);

    const triggerSuccessUI = () => {
        document.querySelectorAll('.molding-border > div, .mb-8, #summary-section, #payment-section, #confirm-btn, .mt-4.text-\\[10px\\]').forEach(el => {
            if (el && !el.id?.includes('success')) el.classList.add('hidden');
        });
        const successSection = document.getElementById('payment-success-section');
        if (successSection) {
            successSection.classList.remove('hidden');
            setTimeout(() => {
                successSection.classList.remove('opacity-0');
                successSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    if (isPaidOnLoad) {
        triggerSuccessUI();
    } else {
        const roomsListContainer = document.getElementById('checkout-rooms-list');
        if (roomsListContainer) {
            roomsListContainer.innerHTML = (Array.isArray(roomsData) ? roomsData : [roomsData]).map(room => `
                <div class="border border-primary/40 p-6 rounded-xl bg-background-light/80 shadow-md relative overflow-hidden text-black">
                    <div class="w-full h-56 bg-center bg-cover rounded-lg mb-6 border-2 border-primary/20" style="background-image: url('${room.img}');"></div>
                    <h3 class="text-2xl font-serif font-bold mb-4 border-b-2 border-primary/30 pb-3">${room.name}</h3>
                    <div class="space-y-4">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-sm font-medium italic">Thời gian:</span>
                            <span class="text-sm font-bold leading-tight">Ngày Nhận ${formatDateObj(checkinDate)} - Ngày Trả ${formatDateObj(checkoutDate)} - ${nights} đêm</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        setSafeText('checkout-total', renderCurrency(grandTotalAmount));
        setSafeText('checkout-deposit', renderCurrency(depositAmount));

        // Fetch Payment Link (RELATIVE PATH)
        const fetchPayment = () => {
            const qrImg = document.getElementById('checkout-qr');
            const qrLoading = document.getElementById('qr-loading');
            const qrMsg = document.getElementById('qr-status-msg');
            const retryBtn = document.getElementById('qr-retry-btn');
            const phone = (bookingData.phone || '000').replace(/\s+/g, '');

            if (qrLoading) qrLoading.classList.remove('hidden');
            if (retryBtn) retryBtn.classList.add('hidden');
            if (qrMsg) qrMsg.innerHTML = 'Đang khởi tạo thanh toán...<br/><span class="font-normal italic">(Hệ thống có thể mất 30s để khởi động lần đầu)</span>';

            fetch('/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: depositAmount, description: `COC CHON ${phone}` })
            })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'ERROR') throw new Error(data.error || "Lỗi từ PayOS");
                if (data.qrCode) {
                    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrCode)}`;
                    if (qrLoading) qrLoading.classList.add('hidden');
                    
                    const pollInterval = setInterval(async () => {
                        try {
                            const checkResult = await fetch(`/check-payment/${data.orderCode}`);
                            const checkData = await checkResult.json();
                            if (checkData.status === 'PAID') {
                                clearInterval(pollInterval);
                                triggerSuccessUI();
                            }
                        } catch (e) { console.error("Poll Error:", e); }
                    }, 3000);
                } else { throw new Error("Server không trả về mã QR"); }
            })
            .catch(err => {
                if (qrMsg) qrMsg.innerHTML = `<span class="text-red-500 font-bold">LỖI: ${err.message}</span><br/><span class="text-[8px] opacity-70">URL site: ${window.location.href}</span>`;
                if (retryBtn) {
                    retryBtn.classList.remove('hidden');
                    retryBtn.onclick = fetchPayment;
                }
            });
        };

        const agreeCheckbox = document.getElementById('agree-checkbox');
        if (agreeCheckbox) {
            agreeCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    document.getElementById('summary-section')?.classList.remove('hidden');
                    document.getElementById('payment-section')?.classList.remove('hidden');
                    fetchPayment();
                }
            });
        }
    }

    // Bill & Copy logic (keep same as before)
    document.getElementById('generate-bill-btn')?.addEventListener('click', () => {
        const name = document.getElementById('success-guest-name')?.value.trim();
        const zalo = document.getElementById('success-guest-zalo')?.value.trim();
        if (!name || !zalo) { alert("Vui lòng điền đầy đủ Họ tên và Zalo."); return; }
        const roomNames = (Array.isArray(roomsData) ? roomsData : [roomsData]).map(r => r.name).join(', ');
        const remaining = grandTotalAmount - depositAmount;

        const billHtml = `
            <div class="space-y-6 text-black" style="font-family: sans-serif; line-height: 1.6;">
                <div class="text-center font-bold text-xl mb-4">𝐗𝐀́𝐂 𝐍𝐇𝐀̣̂𝐍 𝐓𝐇𝐎̂𝐍𝐆 𝐓𝐈𝐍 𝐓𝐇𝐔𝐄̂ 𝐇𝐎𝐌𝐄</div>
                <div>
                    <div class="font-bold underline mb-1">➖𝐓𝐇𝐎̂𝐍𝐆 𝐓𝐈𝐍</div>
                    <div>- Địa chỉ: 07 Thánh Tâm - Phường 5, TP. Đà Lạt</div>
                    <div>- Liên hệ nhận phòng: 0889717713 (Mr. Trọng Đạt)</div>
                    <div>- Hình thức thuê: <span class="font-bold">${roomNames}</span></div>
                </div>
                <div>
                    <div class="font-bold underline mb-1">➖𝐓𝐇𝐎̂𝐍𝐆 𝐓𝐈𝐍 𝐊𝐇𝐀́𝐂𝐇</div>
                    <div>- Tên khách hàng: <span class="font-bold uppercase">${name}</span></div>
                    <div>- Số điện thoại: <span class="font-bold">${zalo}</span></div>
                    <div>- Số người: ${(parseInt(bookingData.adults) || 2) + (parseInt(bookingData.children) || 0)} khách</div>
                    <div>- Số ngày thuê: ${nights} đêm</div>
                    <div>* Ngày nhận nhà: 14h00 ngày ${formatDateObj(checkinDate)}</div>
                    <div>* Ngày trả nhà: 12h00 ngày ${formatDateObj(checkoutDate)}</div>
                </div>
                <div>
                    <div class="font-bold underline mb-1">✅ 𝐓𝐇𝐀𝐍𝐇 𝐓𝐎𝐀́𝐍</div>
                    <div>- Thuê nhà: ${renderCurrency(grandTotalAmount)}</div>
                    <div>- Đã cọc: ${renderCurrency(depositAmount)} ( Xác nhận đã nhận )</div>
                    <div>- Còn lại: <span class="text-red-600 font-bold">${renderCurrency(remaining)}</span></div>
                </div>
            </div>`;
        const content = document.getElementById('bill-content');
        if (content) content.innerHTML = billHtml;
        const container = document.getElementById('final-bill-container');
        if (container) {
            container.classList.remove('hidden');
            setTimeout(() => {
                container.classList.remove('opacity-0');
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    });
});
