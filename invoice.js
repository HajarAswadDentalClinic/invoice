let itemCounter = 0;
let itemsData = [];
let doctorsData = [];

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

function parseRupiah(value) {
  return parseFloat(value.replace(/[^\d,-]/g, "").replace(",", ".")) || 0;
}

function loadData() {
  $.getJSON("./data.json", function (data) {
    console.log("Data loaded:", data);
    itemsData = data.items;
    doctorsData = data.doctors;
    populateDoctorDropdown();
  }).fail(function () {
    console.error("Failed to load data.json. Please check the file path or the JSON structure.");
  });
}

function populateDoctorDropdown() {
  doctorsData.forEach((doctor) => {
    $("#doctorSelect").append(`<option value="${doctor.id}">${doctor.name}</option>`);
  });
}

function addInvoiceItem() {
  itemCounter++;
  const newItemRow = `
    <tr id="itemRow${itemCounter}">
      <td>
        <select class="form-control descriptionSelect" required>
          <option value="">Select Product</option>
          ${itemsData.map((item) => `<option value="${item.unitPrice}">${item.description}</option>`).join("")}
        </select>
      </td>
      <td>
        <input type="number" class="form-control quantity text-center" value="1" required>
      </td>
      <td>
        <input type="text" class="form-control unitPrice transparent" disabled readonly>
      </td>
      <td>
        <input type="text" class="form-control totalItemPrice transparent" disabled readonly>
      </td>
      <td>
        <button type="button" class="btn btn-outline-danger" onclick="removeInvoiceItem(${itemCounter})">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `;
  $("#invoiceItems").append(newItemRow);
  updateTotalAmount();
}

function removeInvoiceItem(itemId) {
  $(`#itemRow${itemId}`).remove();
  updateTotalAmount();
}

function applyDiscount() {
  const discountValue = parseRupiah($("#discountInput").val());
  let totalAmount = 0;

  $("tr[id^='itemRow']").each(function () {
    const quantity = parseFloat($(this).find(".quantity").val()) || 1;
    const unitPrice = parseRupiah($(this).find(".unitPrice").val()) || 0;
    const totalItemPrice = quantity * unitPrice;

    $(this).find(".totalItemPrice").val(formatRupiah(totalItemPrice));
    totalAmount += totalItemPrice;
  });

  totalAmount -= discountValue;

  $("#totalAmount").val(formatRupiah(totalAmount));
  togglePreviewButton();
}

function updateTotalAmount() {
  applyDiscount();
}

$("#discountInput").on("input", function () {
  updateTotalAmount();
});

$("#discountInput").on("blur", function () {
  const value = parseRupiah($(this).val());
  $(this).val(formatRupiah(value));
});

function togglePreviewButton() {
  const totalAmount = parseRupiah($("#totalAmount").val());
  $("#previewInvoiceBtn").prop("disabled", totalAmount <= 0);
}

$(document).ready(function () {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  $("#invoiceDate").val(formattedDate);

  togglePreviewButton();
  loadData();
});

$(document).on("input", ".quantity", function () {
  updateTotalAmount();
});

$(document).on("change", ".descriptionSelect", function () {
  const unitPrice = $(this).val();
  $(this).closest("tr").find(".unitPrice").val(formatRupiah(unitPrice));
  updateTotalAmount();
});

$("#customerBirth").on("change", function () {
  const birthDate = new Date($(this).val());
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  $("#customerAge").val(`${years} tahun, ${months} bulan, ${days} hari`);
});

$("#invoiceForm").on("submit", function (event) {
  event.preventDefault();
});

function validateBeforePreview() {
  const customerName = $("#customerName").val().trim();
  const doctorSelect = $("#doctorSelect").val();
  const customerAddress = $("#customerAddress").val().trim();
  const customerAge = $("#customerAge").val().trim();
  const itemCount = $("tr[id^='itemRow']").length;

  if (!doctorSelect) {
    alert("Please select a doctor.");
    $("#doctorSelect").focus();
    return false;
  }

  if (!customerName) {
    alert("Customer Name is required. Please enter a valid name.");
    $("#customerName").focus();
    return false;
  }

  if (!customerAddress) {
    alert("Customer Address is required. Please enter a valid address.");
    $("#customerAddress").focus();
    return false;
  }

  if (!customerAge) {
    alert("Customer Age is required. Please enter the customer's age.");
    $("#customerAge").focus();
    return false;
  }

  if (itemCount === 0) {
    alert("Please add at least one item to the invoice.");
    return false;
  }

  return true;
}

function previewInvoice() {
  if (!validateBeforePreview()) {
    return;
  }

  $.get("./sdf.html", function (data) {
    const customerName = $("#customerName").val().trim();
    const customerAddress = $("#customerAddress").val().trim();
    const doctorName = $("#doctorSelect option:selected").text();
    const invoiceDate = $("#invoiceDate").val();
    const customerBirthInput = $("#customerBirth").val();
    const customerAge = $("#customerAge").val().trim();

    const customerBirth = new Date(customerBirthInput).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Konversi invoiceDate ke objek Date
    const invoiceDateObj = new Date(invoiceDate.split(" ").reverse().join("-"));

    // Hitung expired date dengan menambah 100 hari dari invoiceDate
    const expiredDateObj = new Date(invoiceDateObj);
    expiredDateObj.setDate(expiredDateObj.getDate() + 100);

    // Format expired date agar sesuai dengan format invoiceDate
    const expiredDate = expiredDateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let itemsHtml = "";

    $("tr[id^='itemRow']").each(function () {
      const description = $(this).find(".descriptionSelect option:selected").text();
      const quantity = $(this).find(".quantity").val();
      const unitPrice = $(this).find(".unitPrice").val();
      const totalItemPrice = $(this).find(".totalItemPrice").val();

      itemsHtml += `
            <tr>
              <td>${description}</td>
              <td class="text-center">${quantity}</td>
              <td>${unitPrice}</td>
              <td>${totalItemPrice}</td>
            </tr>
          `;
    });

    const totalAmount = parseRupiah($("#totalAmount").val());
    const discount = parseRupiah($("#discountInput").val()) || 0;
    // const discountedAmount = totalAmount - discount;
    const pointAmount = totalAmount * 0.1; // 10% dari totalAmount setelah diskon
    const pointAvg = Math.floor(pointAmount / 2500); // pointAmount dibagi 2500

    // Ganti placeholder dengan data nyata
    const filledInvoice = data
      .replace("{{customerName}}", customerName)
      .replace("{{invoiceDate}}", invoiceDate)
      .replace("{{expiredDate}}", expiredDate)
      .replace("{{invoiceItems}}", itemsHtml)
      .replace("{{totalAmount}}", formatRupiah(totalAmount))
      .replace("{{doctorName}}", doctorName)
      .replace("{{customerAddress}}", customerAddress)
      .replace("{{customerBirth}}", customerBirth)
      .replace("{{customerAge}}", customerAge)
      .replace("{{discount}}", formatRupiah(discount))
      .replace("{{pointAmount}}", formatRupiah(pointAmount))
      .replace("{{pointAvg}}", pointAvg);

    const newWindow = window.open("", "_blank");
    newWindow.document.write(filledInvoice);
    newWindow.document.close();

    // Refresh halaman setelah unduhan selesai
    location.reload();
  }).fail(function () {
    alert("Failed to load the invoice template. Please check the file path.");
  });
}

function printInvoice() {
  window.print();
}
