// ===========================================================================
// GOOGLE APPS SCRIPT — RSVP + ALERTS
// ===========================================================================
//
// SETUP:
//
// 1. Create a spreadsheet with two sheets:
//    - "RSVPs" (or default): Timestamp | Name | Phone | Attending | Guests | Meal | Drink | Dietary | Plus One Name
//    - "Alerts": id | title | body | date | urgent
//
// 2. Extensions → Apps Script → paste this code
// 3. Deploy → Web app → Execute as "Me" → Who has access "Anyone"
// 4. Use the URL for VITE_GOOGLE_SHEETS_URL (RSVP) and VITE_ALERTS_SHEETS_URL (alerts)
//
// ===========================================================================

// --- ALERTS: GET returns alerts from "Alerts" sheet ---
// Sheet columns (Row 1): id | title | body | date | urgent
// urgent = true/false or 1/0
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Alerts");
    var alerts = [];
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var id = String(row[0] || "").trim();
        if (!id) continue;
        var u = row[4];
        var urgent = u === true || String(u).toLowerCase() === "true" || u === "1";
        alerts.push({
          id: id,
          title: String(row[1] || "").trim(),
          body: String(row[2] || "").trim(),
          date: String(row[3] || "").trim(),
          urgent: urgent,
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ alerts: alerts }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ alerts: [], error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- RSVP: POST appends to active sheet ---
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name || "",
      data.phone || "",
      data.attending || "",
      data.guests || "1",
      data.meal || "",
      data.drink || "",
      data.dietary || "",
      data.plusOneName || "",
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", message: "RSVP saved!" })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function — run this in Apps Script to verify it works
function testDoPost() {
  var testEvent = {
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        name: "Test Guest",
        phone: "+91 98765 43210",
        attending: "Joyfully Accept",
        guests: "2",
        meal: "Veg",
        drink: "Coorg Coffee",
        dietary: "None",
        plusOneName: "Test Plus One",
      }),
    },
  };

  var result = doPost(testEvent);
  Logger.log(result.getContent());
}
