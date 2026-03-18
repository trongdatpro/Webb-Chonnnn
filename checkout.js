document.addEventListener('DOMContentLoaded', () => {
    // DIAGNOSTIC VERSION: v2.4-bulletproof
    const diagServer = document.getElementById('diag-server');
    const diagUrl = document.getElementById('diag-url');
    if (diagUrl) diagUrl.textContent = window.location.href;

    // 0. Server Health Check
    const checkServer = () => {
        fetch('/ping')
            .then(r => r.json())
            .then(() => {
                if (diagServer) { diagServer.textContent = 'ONLINE'; diagServer.className = 'text-green-400 font-bold'; }
            })
            .catch(e => {
                if (diagServer) { diagServer.textContent = 'ERROR/SLEEPING'; diagServer.className = 'text-red-400 font-bold'; }
                console.warn("Server Check Failed:", e);
            });
    };
    checkServer();

    // 1. Helpers
    const renderCurrency = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
    const setSafeText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    // 2. Data Retrieval
    const urlParams = new URLSearchParams(window.location.search);
    const isPaidOnLoad = (urlParams.get('status') || '').toUpperCase() === 'PAID';
    const bookingData = JSON.parse(sessionStorage.getItem('chonVillageBooking') || '{}');
    const roomsDataRaw = JSON.parse(sessionStorage.getItem('chonVillageSelectedRooms') || sessionStorage.getItem('chonVillageSelectedRoom') || '[]');
    const roomsData = Array.isArray(roomsDataRaw) ? roomsDataRaw : [roomsDataRaw];

    if (!isPaidOnLoad && (!bookingData.checkin || (Array.isArray(roomsData) ? roomsData.length === 0 : !roomsData.name))) {
        window.location.href = 'index.html';
        return;
    }

    // 3. Calculation
    const parseLocal = (s) => { if(!s) return new Date(); const [y,m,d]=s.split('-'); return new Date(y,m-1,d); };
    const checkin = parseLocal(bookingData.checkin);
    const checkout = parseLocal(bookingData.checkout);
    const nights = Math.max(1, Math.ceil(Math.abs(checkout - checkin) / (1000 * 60 * 60 * 24)));
    const formatDateObj = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    let baseTotal = 0;
    const surcharges = [];
    roomsData.forEach(r => {
        baseTotal += (parseInt(r.baseRoomTotal) || 0);
        surcharges.push(parseInt(r.surcharge) || 450000);
    });

    const extraGuests = Math.max(0, (parseInt(bookingData.adults) || 2) - (roomsData.length * 2));
    const sortedRates = [...surcharges].sort((a,b)=>a-b);
    let surchargePerNight = 0;
    if (roomsData.length === 3) {
        if (extraGuests === 1) surchargePerNight = (new Set(sortedRates).size === 3) ? sortedRates[1] : sortedRates[0];
        else if (extraGuests === 2) surchargePerNight = sortedRates[0] + sortedRates[1];
        else for(let i=0; i<extraGuests; i++) surchargePerNight += sortedRates[i] || sortedRates[0];
    } else {
        for(let i=0; i<extraGuests; i++) surchargePerNight += sortedRates[i] || sortedRates[0];
    }

    const grandTotal = baseTotal + (surchargePerNight * nights);
    const deposit = Math.floor(grandTotal / 2);

    // 4. UI Trigger
    const triggerSuccess = () => {
        document.querySelectorAll('#summary-section, .molding-border h2, .mb-8').forEach(el => el.classList.add('hidden'));
        const success = document.getElementById('payment-success-section');
        if (success) {
            success.classList.remove('hidden');
            setTimeout(() => success.classList.remove('opacity-0'), 100);
            success.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (isPaidOnLoad) { triggerSuccess(); } else {
        // Render List
        const list = document.getElementById('checkout-rooms-list');
        if (list) {
            list.innerHTML = roomsData.map(room => `
                <div class="border border-primary/40 p-6 rounded-xl bg-white shadow-md text-black mb-4">
                    <div class="w-full h-48 bg-center bg-cover rounded-lg mb-4" style="background-image: url('${room.img}');"></div>
                    <h3 class="text-xl font-serif font-bold mb-2">${room.name}</h3>
                    <div class="text-sm font-bold opacity-70">${formatDateObj(checkin)} - ${formatDateObj(checkout)} (${nights} đêm)</div>
                </div>
            `).join('');
        }
        setSafeText('checkout-total', renderCurrency(grandTotal));
        setSafeText('checkout-deposit', renderCurrency(deposit));

        // 5. Fetch Payment (PROBABLY HANGING FIX)
        const fetchPayment = () => {
            const qrImg = document.getElementById('checkout-qr');
            const qrLoading = document.getElementById('qr-loading');
            const qrMsg = document.getElementById('qr-status-msg');
            const retryBtn = document.getElementById('qr-retry-btn');
            const fallbackDiv = document.getElementById('fallback-link-div');
            const directLink = document.getElementById('direct-checkout-link');
            const phone = (bookingData.phone || '000').replace(/\s+/g, '');

            if (qrLoading) qrLoading.classList.remove('hidden');
            if (retryBtn) retryBtn.classList.add('hidden');
            if (qrMsg) qrMsg.textContent = "Đang khởi tạo...";

            // Timeout fallback: if no response in 10s, show the fallback help
            const hangTimer = setTimeout(() => {
                if (qrLoading && !qrLoading.classList.contains('hidden')) {
                  if (qrMsg) qrMsg.innerHTML = '<span class="text-red-500 font-bold">KHỞI TẠO CHẬM</span><br/>Server Render đang thức giấc...';
                  if (retryBtn) retryBtn.classList.remove('hidden');
                }
            }, 15000);

            fetch('/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: deposit, description: `COC CHON ${phone}` })
            })
            .then(res => {
                clearTimeout(hangTimer);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'ERROR') throw new Error(data.error);
                if (data.checkoutUrl) {
                    // Update Fallback Link
                    if (directLink) directLink.href = data.checkoutUrl;
                    if (fallbackDiv) fallbackDiv.classList.remove('hidden');

                    if (data.qrCode) {
                        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrCode)}`;
                        qrImg.onload = () => { if(qrLoading) qrLoading.classList.add('hidden'); };
                        
                        // Polling
                        const poll = setInterval(async () => {
                            try {
                                const ck = await fetch(`/check-payment/${data.orderCode}`);
                                const cd = await ck.json();
                                if (cd.status === 'PAID') { clearInterval(poll); triggerSuccess(); }
                            } catch (e) {}
                        }, 3000);
                    } else {
                        // QR missing but we have URL? Just redirect or show link
                        if(qrLoading) qrLoading.classList.add('hidden');
                        if(fallbackDiv) fallbackDiv.classList.remove('hidden');
                    }
                } else { throw new Error("Missing checkoutUrl"); }
            })
            .catch(err => {
                clearTimeout(hangTimer);
                if (qrMsg) qrMsg.innerHTML = `<span class="text-red-500 font-bold">LỖI: ${err.message}</span>`;
                if (retryBtn) { retryBtn.classList.remove('hidden'); retryBtn.onclick = fetchPayment; }
            });
        };

        const agreeCheck = document.getElementById('agree-checkbox');
        if (agreeCheck) {
            agreeCheck.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const summary = document.getElementById('summary-section');
                if (summary) {
                    summary.classList.toggle('hidden', !isChecked);
                    setTimeout(() => summary.classList.toggle('opacity-0', !isChecked), 10);
                }
                if (isChecked && !document.getElementById('checkout-qr').src) fetchPayment();
            });
        }
    }

    // 6. Success Logic
    document.getElementById('generate-bill-btn')?.addEventListener('click', () => {
        const name = document.getElementById('success-guest-name')?.value.trim();
        const zalo = document.getElementById('success-guest-zalo')?.value.trim();
        if (!name || !zalo) return alert("Vui lòng điền đủ thông tin.");
        
        const content = document.getElementById('bill-content');
        if (content) {
            content.innerHTML = `
                <div class="space-y-4 text-black font-sans">
                    <div class="text-center font-bold text-xl uppercase">Hóa đơn xác nhận cọc</div>
                    <div class="border-b pb-2"><b>Khách hàng:</b> ${name.toUpperCase()}</div>
                    <div class="border-b pb-2"><b>Zalo:</b> ${zalo}</div>
                    <div class="border-b pb-2"><b>Phòng:</b> ${roomsData.map(r=>r.name).join(', ')}</div>
                    <div class="border-b pb-2"><b>Thời gian:</b> ${formatDateObj(checkin)} - ${formatDateObj(checkout)}</div>
                    <div class="pt-2 text-lg">
                        <div><b>Tổng:</b> ${renderCurrency(grandTotal)}</div>
                        <div class="text-green-600"><b>Đã cọc:</b> ${renderCurrency(deposit)}</div>
                        <div class="text-red-600 font-bold italic">Còn lại: ${renderCurrency(grandTotal-deposit)}</div>
                    </div>
                </div>`;
        }
        const container = document.getElementById('final-bill-container');
        if (container) {
            container.classList.remove('hidden');
            setTimeout(() => container.classList.remove('opacity-0'), 100);
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });

    document.getElementById('copy-bill-btn')?.addEventListener('click', (e) => {
        const t = document.getElementById('bill-content')?.innerText;
        if (t) navigator.clipboard.writeText(t).then(() => {
            const b = e.currentTarget; const old = b.innerHTML; b.innerHTML = "Đã chép!";
            setTimeout(() => b.innerHTML = old, 2000);
        });
    });
});
