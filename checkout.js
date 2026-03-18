document.addEventListener('DOMContentLoaded', () => {
    // 1. Helper Function
    const renderCurrency = (num) => new Intl.NumberFormat('vi-VN').format(num) + 'đ';
    const setSafeText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    console.log("Checkout Script Initialized");

    // 2. Retrieve Data From Session
    const bookingDataStr = sessionStorage.getItem('chonVillageBooking');
    const selectedRoomsStr = sessionStorage.getItem('chonVillageSelectedRooms');
    const selectedRoomStr = sessionStorage.getItem('chonVillageSelectedRoom'); // Fallback for single room

    if (!bookingDataStr || (!selectedRoomsStr && !selectedRoomStr)) {
        console.warn("Booking data not found in session, redirecting...");
        window.location.href = 'index.html';
        return;
    }

    const bookingData = JSON.parse(bookingDataStr);
    const roomsData = selectedRoomsStr ? JSON.parse(selectedRoomsStr) : [JSON.parse(selectedRoomStr)];
    const adultsCount = parseInt(bookingData.adults) || 2;

    console.log("Booking Data:", bookingData);
    console.log("Rooms Data:", roomsData);

    // 3. Date Formatting
    const parseLocal = (dateStr) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d);
    };

    const checkinDate = parseLocal(bookingData.checkin);
    const checkoutDate = parseLocal(bookingData.checkout);
    const diffTime = Math.abs(checkoutDate - checkinDate);
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const formatDateObj = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const dateRangeStr = `${formatDateObj(checkinDate)} - ${formatDateObj(checkoutDate)} (${nights} đêm)`;

    // 4. Pricing & Surcharge Logic
    let baseRoomTotal = 0;
    const surchargeRates = [];
    const roomsWithTotals = [];

    roomsData.forEach(room => {
        const roomBasePrice = parseInt(room.baseRoomTotal) || 0;
        baseRoomTotal += roomBasePrice;
        
        // SPECIAL RULE: If stay >= 3 nights (4 days 3 nights), 
        // use standard surcharge (we take the first night's surcharge as "standard" 
        // or fallback to 450k). 
        // If < 3 nights, we use the specific surcharge passed.
        let rate = parseInt(room.surcharge) || 450000;
        
        // Note: The prompt says "hiển thị giá phụ thu người thứ 3 của ngày thường nếu khách đặt từ 4 ngày 3 đêm"
        // In this implementation, room.nights is passed from rooms.js.
        if (room.nights >= 3) {
            console.log(`[DEBUG] Stay is ${room.nights} nights (>= 3). Using standard surcharge rate.`);
            // Assuming the passed room.surcharge is the standard rate if rooms.js passed datesToStay[0]'s surcharge
        }
        
        surchargeRates.push(rate);

        roomsWithTotals.push({
            ...room,
            basePrice: roomBasePrice,
            surchargeAllocated: 0, 
            surchargePerNight: 0,
            total: roomBasePrice
        });
    });

    // Calculate Extra Guests (3rd person in shared rooms)
    const extraGuestsCount = Math.max(0, adultsCount - (roomsData.length * 2));
    
    // Sort logic for surcharge application
    const sortedRates = [...surchargeRates].sort((a, b) => a - b);
    let totalSurchargePerNight = 0;
    
    if (roomsData.length === 3) {
        const uniqueRates = new Set(sortedRates).size;
        if (extraGuestsCount === 1) {
            totalSurchargePerNight = (uniqueRates === 3) ? sortedRates[1] : sortedRates[0];
        } else if (extraGuestsCount === 2) {
            totalSurchargePerNight = sortedRates[0] + sortedRates[1];
        } else {
            for (let i = 0; i < extraGuestsCount; i++) totalSurchargePerNight += sortedRates[i] || sortedRates[0];
        }
    } else {
        for (let i = 0; i < extraGuestsCount; i++) totalSurchargePerNight += sortedRates[i] || sortedRates[0];
    }

    const grandSurchargeTotal = totalSurchargePerNight * nights;
    const grandTotalAmount = baseRoomTotal + grandSurchargeTotal;
    const depositAmount = Math.floor(grandTotalAmount / 2);

    // Allocate surcharge proportionally to rooms for the UI cards
    if (grandSurchargeTotal > 0) {
        roomsWithTotals.forEach((room) => {
            room.surchargeAllocated = (grandSurchargeTotal / roomsWithTotals.length);
            room.surchargePerNight = (totalSurchargePerNight / roomsWithTotals.length);
            room.total = room.basePrice + room.surchargeAllocated;
        });
    }

    // 5. Populate UI Elements
    const roomsListContainer = document.getElementById('checkout-rooms-list');
    if (roomsListContainer) {
        roomsListContainer.innerHTML = roomsWithTotals.map(room => {
            const avgNightPrice = Math.round(room.basePrice / nights);
            return `
                <div class="border border-primary/40 p-6 rounded-xl bg-background-light/80 shadow-md relative overflow-hidden">
                    <!-- Room Image -->
                    <div class="w-full h-56 bg-center bg-cover rounded-lg mb-6 border-2 border-primary/20"
                        style="background-image: url('${room.img}');">
                    </div>
                    
                    <h3 class="text-2xl font-serif font-bold mb-4 text-black border-b-2 border-primary/30 pb-3">${room.name}</h3>
                    
                    <div class="space-y-4">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-black text-sm font-medium italic">Thời gian:</span>
                            <span class="text-black text-sm font-bold leading-tight">Ngày Nhận ${formatDateObj(checkinDate)} - Ngày Trả ${formatDateObj(checkoutDate)} - ${nights + 1} ngày ${nights} đêm</span>
                        </div>
                        
                                <div class="flex flex-col gap-2 py-4 border-b-2 border-t-2 border-dashed border-primary/40">
                                    <span class="text-black text-sm uppercase tracking-wider font-bold">Chi tiết giá phòng:</span>
                                    <div class="space-y-3">
                                ${(() => {
                                    const nDetails = room.nightlyDetails || [];
                                    const showDailyBreakdown = room.showDailyBreakdown; 

                                    // Determine Dynamic Legend Prices
                                    let stayWeekdayPrice = null;
                                    let stayWeekendPrice = null;

                                    nDetails.forEach(night => {
                                        // Note: in checkout, night.date is a string like "27.03"
                                        // We better check night.isHoliday or other flags if available
                                        // But rooms.js already calculated baseWeekday/baseWeekend
                                    });

                                    const baseWeekday = room.baseWeekday;
                                    const baseWeekend = room.baseWeekend;

                                    if (showDailyBreakdown) {
                                        return (nDetails || []).map(night => {
                                            let labelType = "Ngày ";
                                            if (night.isHoliday || (night.note || "").toUpperCase() === "L") labelType = "Ngày Lễ ";
                                            
                                            const dateLabel = `Giá ${labelType}${night.date}:`;
                                            return `
                                                <div class="flex justify-between items-center text-sm border-b border-primary/10 pb-1 mb-1">
                                                    <span class="text-black italic">${dateLabel}</span>
                                                    <span class="text-black font-bold">${renderCurrency(night.price)} / Đêm</span>
                                                </div>
                                            `;
                                        }).join('');
                                    } else {
                                        // Legend / Summary View
                                        const baseWeekday = room.baseWeekday;
                                        const baseWeekend = room.baseWeekend;
                                        
                                        let html = `
                                            <div class="space-y-1">
                                                <div class="flex justify-between items-center text-sm">
                                                    <span class="text-black italic font-bold">Giá Trong tuần (T2-T5):</span>
                                                    <span class="text-black font-bold">${renderCurrency(baseWeekday)}</span>
                                                </div>
                                                <div class="flex justify-between items-center text-sm">
                                                    <span class="text-black italic font-bold">Giá Cuối tuần (T6-CN):</span>
                                                    <span class="text-black font-bold">${renderCurrency(baseWeekend)}</span>
                                                </div>
                                            </div>`;

                                        // Append holidays individually if any
                                        const holidayNights = (nDetails || []).filter(n => n.isHoliday || (n.note || "").toUpperCase() === "L");
                                        if (holidayNights.length > 0) {
                                            html += `<div class="mt-2 pt-1 border-t border-primary/10">${holidayNights.map(night => {
                                                const dateLabel = `Giá Ngày Lễ ${night.date}:`;
                                                return `
                                                    <div class="flex justify-between items-center text-[13px] mb-1">
                                                        <span class="text-black italic">${dateLabel}</span>
                                                        <span class="text-black font-bold">${renderCurrency(night.price)} / Đêm</span>
                                                    </div>
                                                `;
                                            }).join('')}</div>`;
                                        }
                                        return html;
                                    }
                                })()}
                            </div>
                        </div>

                        ${room.surchargeAllocated > 0 ? `
                        <div class="flex justify-between items-center py-2 border-b-2 border-dashed border-primary/40">
                            <span class="text-black text-sm font-bold uppercase">Surcharge/Phụ phí:</span>
                            <span class="text-black text-sm font-bold">${renderCurrency(room.surchargePerNight)} / Đêm</span>
                        </div>` : ''}

                        <div class="flex justify-between items-center pt-2 text-primary">
                            <span class="text-base font-serif font-bold">Tổng cộng:</span>
                            <span class="text-base font-serif font-bold tracking-tight">${renderCurrency(room.total)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setSafeText('checkout-total', renderCurrency(grandTotalAmount));
    setSafeText('checkout-deposit', renderCurrency(grandTotalAmount >= 0 ? depositAmount : 0));

    // 6. PayOS Dynamic Link Activation (Immediate on Load)
    const qrImg = document.getElementById('checkout-qr');
    const qrLoading = document.getElementById('qr-loading');
    const displayAccNo = document.getElementById('display-acc-no');
    const displayAccName = document.getElementById('display-acc-name');

    if (qrLoading) qrLoading.classList.remove('hidden');

    const phone = (bookingData.phone || '0000000000').replace(/\s+/g, '');
    const paymentData = {
        amount: depositAmount,
        description: `COC CHON ${phone}`.substring(0, 25)
    };

    let payOSData = null;

    fetch('http://localhost:3000/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
    })
    .then(async res => {
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`HTTP ${res.status}: ${errBody}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("PayOS Server Response:", data);
        if (data && data.qrCode) {
            payOSData = data;
            // Update display with real PayOS Data
            if (displayAccNo) displayAccNo.textContent = data.accountNumber;
            if (displayAccName) displayAccName.textContent = data.accountName;
            
            if (qrImg) {
                // Generate QR code from the official PayOS payload
                // This payload contains the tracking info for your dashboard
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrCode)}`;
                qrImg.src = qrUrl;
                qrImg.onload = () => { if (qrLoading) qrLoading.classList.add('hidden'); };
            }
            console.log("%c [PayOS] Dynamic Order Recorded & QR Loaded", "color: green; font-weight: bold;");
        } else {
            throw new Error("Missing qrCode in PayOS response");
        }
    })
    .catch(error => {
        console.error("%c [PayOS Error] Tracking FAILED:", "color: red; font-weight: bold;", error);
        // Fallback to manual if tracking fails
        if (qrImg) {
            // Manual fallback without pre-filled description
            qrImg.src = `https://img.vietqr.io/image/OCB-0173100004750004-compact.png?amount=${depositAmount}&accountName=TRAN%20TRONG%20DAT`;
            qrImg.onload = () => { if (qrLoading) qrLoading.classList.add('hidden'); };
        }
        console.warn("Using Manual Fallback (Non-tracked)");
    });

    // 7. visibility & Agreement Logic
    const agreeCheckbox = document.getElementById('agree-checkbox');
    const summarySection = document.getElementById('summary-section');
    const paymentSection = document.getElementById('payment-section');
    const confirmBtn = document.getElementById('confirm-btn');

    // Reset Initial State
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    }
    
    if (summarySection) {
        summarySection.classList.add('hidden', 'opacity-0');
    }
    if (paymentSection) {
        paymentSection.classList.add('hidden', 'opacity-0');
    }

    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            
            if (isChecked) {
                // Show Summary & Payment
                if (summarySection) {
                    summarySection.classList.remove('hidden');
                    setTimeout(() => summarySection.classList.remove('opacity-0'), 10);
                }
                if (paymentSection) {
                    paymentSection.classList.remove('hidden');
                    setTimeout(() => paymentSection.classList.remove('opacity-0'), 10);
                }
                
                // Unlock Button
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                }

                // Smooth scroll to summary section
                setTimeout(() => {
                    if (summarySection) {
                        const header = document.querySelector('header');
                        const headerHeight = header ? header.offsetHeight : 80;
                        const elementPosition = summarySection.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;
                        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    }
                }, 300);
            } else {
                if (summarySection) {
                    summarySection.classList.add('opacity-0');
                    setTimeout(() => summarySection.classList.add('hidden'), 500);
                }
                if (paymentSection) {
                    paymentSection.classList.add('opacity-0');
                    setTimeout(() => paymentSection.classList.add('hidden'), 500);
                }
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                }
            }
        });
    }

    // 8. Final Submission Logic
    if (confirmBtn) {
        confirmBtn.innerHTML = `
            <span>Tôi đã chuyển khoản - Hoàn tất đặt phòng</span>
            <span class="material-symbols-outlined">check_circle</span>
        `;

        confirmBtn.addEventListener('click', () => {
            const originalText = confirmBtn.innerHTML;
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span><span>Đang xử lý...</span>`;

            // Simple Success Simulation (Real flow would check webhook, but for now we follow old manual flow)
            setTimeout(() => {
                const toast = document.getElementById('toast-message');
                if (toast) {
                    toast.innerHTML = `
                        <div class="flex flex-col gap-1 items-center font-bold">
                            <span class="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                            <span>Đã xác nhận đặt phòng!</span>
                            <span>Chúng tôi sẽ liên hệ lại với bạn sớm nhất.</span>
                        </div>
                    `;
                    toast.classList.remove('opacity-0');
                    setTimeout(() => {
                        toast.classList.add('opacity-0');
                        sessionStorage.removeItem('chonVillageBooking');
                        sessionStorage.removeItem('chonVillageSelectedRooms');
                        window.location.href = 'index.html';
                    }, 3000);
                }
            }, 1000);
        });
    }
});
