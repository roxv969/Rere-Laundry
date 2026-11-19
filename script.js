import { db } from './firebase-config.js';
import {
    doc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- Mobile Menu Toggle ---
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
    });
});

function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- Interactive Calculator ---
const calcService = document.getElementById('calc-service');
const calcWeightRange = document.getElementById('calc-weight-range');
const calcWeightInput = document.getElementById('calc-weight-input');
const optParfum = document.getElementById('opt-parfum');
const optAntiBakteri = document.getElementById('opt-anti-bakteri');
const calcTotal = document.getElementById('calc-total');
const calcBreakdown = document.getElementById('calc-breakdown');

function calculateTotal() {
    const pricePerKg = parseInt(calcService.value, 10);
    let weight = parseInt(calcWeightInput.value, 10);

    if (isNaN(weight) || weight < 1) weight = 1;
    else if (weight > 50) weight = 50;

    let extra = 0;
    if (optParfum.checked) extra += parseInt(optParfum.value, 10);
    if (optAntiBakteri.checked) extra += parseInt(optAntiBakteri.value, 10);

    const ratePerKg = pricePerKg + extra;
    const total = ratePerKg * weight;

    calcTotal.innerText = `Rp ${total.toLocaleString('id-ID')}`;
    calcBreakdown.innerText = `Rp ${ratePerKg.toLocaleString('id-ID')}/kg × ${weight} kg`;
}

calcWeightRange.addEventListener('input', (e) => {
    calcWeightInput.value = e.target.value;
    calculateTotal();
});

calcWeightInput.addEventListener('input', (e) => {
    const val = Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), 30);
    calcWeightRange.value = val;
    calculateTotal();
});

calcWeightInput.addEventListener('blur', (e) => {
    if (!e.target.value || parseInt(e.target.value, 10) < 1) {
        e.target.value = 1;
        calcWeightRange.value = 1;
        calculateTotal();
    }
});

calcService.addEventListener('change', calculateTotal);
optParfum.addEventListener('change', calculateTotal);
optAntiBakteri.addEventListener('change', calculateTotal);

function applyEstimateToBooking() {
    const selectedOption = calcService.options[calcService.selectedIndex];
    const serviceName = selectedOption.getAttribute('data-name');
    const weight = calcWeightInput.value || 1;
    const bookService = document.getElementById('book-service');
    const bookNotes = document.getElementById('book-notes');

    for (let i = 0; i < bookService.options.length; i++) {
        if (bookService.options[i].value === serviceName) {
            bookService.selectedIndex = i;
            break;
        }
    }

    const addons = [];
    if (optParfum.checked) addons.push('Parfum Premium');
    if (optAntiBakteri.checked) addons.push('Anti Bakteri & Jamur');

    let noteText = `Estimasi berat ±${weight} kg`;
    if (addons.length > 0) {
        noteText += ` + Tambahan: ${addons.join(', ')}`;
    }
    bookNotes.value = noteText;

    scrollToSection('booking');
}

calculateTotal();

// --- Tracking Resi System (Membaca dari Firebase Firestore) ---
function fillResi(code) {
    document.getElementById('resi-input').value = code;
    checkTracking();
}

document.getElementById('resi-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkTracking();
    }
});

async function checkTracking() {
    const resi = document.getElementById('resi-input').value.trim().toUpperCase();
    const resultDiv = document.getElementById('tracking-result');

    if (!resi) return;

    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `
        <div class="text-center py-6 text-blue-600 font-medium">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
            <p class="text-sm">Memeriksa resi ${resi} di database...</p>
        </div>
    `;

    try {
        const orderRef = doc(db, 'orders', resi);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
            const data = orderSnap.data();
            const steps = [
                { num: 1, label: "Penjemputan", icon: "fa-truck-pickup" },
                { num: 2, label: "Pencucian", icon: "fa-soap" },
                { num: 3, label: "Setrika", icon: "fa-shirt" },
                { num: 4, label: "Selesai", icon: "fa-circle-check" }
            ];

            const stepsHtml = steps.map(s => {
                const isActive = data.step >= s.num;
                return `
                    <div class="flex flex-col items-center text-center p-3 rounded-xl border ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'}">
                        <i class="fa-solid ${s.icon} text-base mb-1.5"></i>
                        <span class="text-xs font-bold">${s.num}. ${s.label}</span>
                    </div>
                `;
            }).join('');

            const weightLabel = data.weight_kg > 0 ? `(${data.weight_kg} kg)` : '(Menunggu timbang kurir)';
            const priceLabel = data.total_price > 0
                ? `Rp ${Number(data.total_price).toLocaleString('id-ID')}`
                : 'Dihitung saat jemput';

            resultDiv.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-5 mb-5 border-b border-slate-100">
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="font-extrabold text-blue-950 text-lg">${data.customer_name}</h4>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">${data.resi}</span>
                        </div>
                        <p class="text-sm text-slate-500 mt-1">${data.service} ${weightLabel} • Masuk: ${data.created_at_text}</p>
                    </div>
                    <div class="sm:text-right">
                        <span class="text-xs text-slate-400 block">Total Tagihan</span>
                        <span class="font-extrabold text-blue-950 text-base">${priceLabel}</span>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center justify-between text-sm">
                        <span class="font-semibold text-slate-600">Status Terkini:</span>
                        <span class="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">${data.status_text}</span>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        ${stepsHtml}
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="text-center py-4">
                    <div class="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
                        <i class="fa-solid fa-circle-exclamation text-xl"></i>
                    </div>
                    <h4 class="font-bold text-slate-800">Nomor Resi Tidak Ditemukan</h4>
                    <p class="text-sm text-slate-500 mt-1">Pastikan kode resi yang dimasukkan sesuai dengan nota pesanan Anda.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error mengambil resi:", error);
        resultDiv.innerHTML = `
            <div class="text-center py-4 text-red-600 text-sm font-medium">
                Gagal memuat data dari Firebase. Periksa koneksi internet dan konfigurasi Firebase Anda.
            </div>
        `;
    }
}

// --- Booking Form: Generate Resi Otomatis & Simpan ke Firestore ---
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Membuat Nomor Resi...';

    const name = document.getElementById('book-name').value.trim();
    const phone = document.getElementById('book-phone').value.trim();
    const address = document.getElementById('book-address').value.trim();
    const service = document.getElementById('book-service').value;
    const rawTime = document.getElementById('book-time').value;
    const notes = document.getElementById('book-notes').value.trim();

    let formattedTime = rawTime;
    if (rawTime) {
        const dateObj = new Date(rawTime);
        formattedTime = dateObj.toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    }

    const todayText = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    try {
        // Transaksi Firestore untuk memastikan nomor resi urut (RL-101, RL-102, dst.) tanpa bentrok
        const counterRef = doc(db, 'counters', 'orders');
        const generatedResi = await runTransaction(db, async (transaction) => {
            const counterSnap = await transaction.get(counterRef);
            let nextNum = 101;

            if (counterSnap.exists()) {
                nextNum = (counterSnap.data().lastNumber || 100) + 1;
            }

            const newResi = `RL-${nextNum}`;
            const newOrderRef = doc(db, 'orders', newResi);

            transaction.set(counterRef, { lastNumber: nextNum });
            transaction.set(newOrderRef, {
                resi: newResi,
                customer_name: name,
                phone: phone,
                address: address,
                service: service,
                pickup_time: formattedTime,
                notes: notes || '-',
                weight_kg: 0,
                total_price: 0,
                step: 1,
                status_text: 'Menunggu Penjemputan Kurir',
                created_at_text: todayText,
                timestamp: serverTimestamp()
            });

            return newResi;
        });

        // Otomatis tampilkan status resi baru di bagian Lacak Status
        document.getElementById('resi-input').value = generatedResi;
        await checkTracking();

        const whatsappNo = "6285185717205"; // Ganti dengan nomor WhatsApp Admin Rere's Laundry
        let message = `Halo *Rere's Laundry*, saya telah melakukan pemesanan antar-jemput:%0A%0A` +
            `• *No. Resi:* ${encodeURIComponent(generatedResi)}%0A` +
            `• *Nama:* ${encodeURIComponent(name)}%0A` +
            `• *No. WhatsApp:* ${encodeURIComponent(phone)}%0A` +
            `• *Alamat:* ${encodeURIComponent(address)}%0A` +
            `• *Paket Layanan:* ${encodeURIComponent(service)}%0A` +
            `• *Jadwal Jemput:* ${encodeURIComponent(formattedTime)}`;

        if (notes) {
            message += `%0A• *Catatan:* ${encodeURIComponent(notes)}`;
        }

        e.target.reset();
        alert(`Pesanan berhasil dibuat! Nomor Resi Anda adalah: ${generatedResi}`);
        window.open(`https://wa.me/${whatsappNo}?text=${message}`, '_blank');
    } catch (error) {
        console.error("Gagal membuat pesanan:", error);
        alert('Gagal menyimpan pesanan ke Firebase. Pastikan Firestore Rules sudah dipublikasikan.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// Daftarkan fungsi ke window agar bisa dipanggil oleh atribut onclick di HTML
window.scrollToSection = scrollToSection;
window.applyEstimateToBooking = applyEstimateToBooking;
window.fillResi = fillResi;
window.checkTracking = checkTracking;