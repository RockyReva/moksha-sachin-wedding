// ===========================================================================
// GOOGLE APPS SCRIPT — RSVP + ALERTS
// ===========================================================================
//
// SETUP:
//
// 1. Create a spreadsheet with two sheets:
//    - "RSVPs" (or default): Timestamp | Name | Phone | Attending | Guests | Veg | Non-Veg | Drink Preference | Ganga Pooja Drink | Consent
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
// Optional "Config" sheet: key | value — set resetReadVersion to a number; increment it to clear "read" state on all devices
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
        var urgent =
          u === true || String(u).toLowerCase() === "true" || u === "1";
        alerts.push({
          id: id,
          title: String(row[1] || "").trim(),
          body: String(row[2] || "").trim(),
          date: String(row[3] || "").trim(),
          urgent: urgent,
        });
      }
    }
    var resetReadVersion = 0;
    var configSheet = ss.getSheetByName("Config");
    if (configSheet) {
      var configData = configSheet.getDataRange().getValues();
      for (var j = 1; j < configData.length; j++) {
        var k = String(configData[j][0] || "").trim();
        if (k === "resetReadVersion") {
          resetReadVersion = Number(configData[j][1]) || 0;
          break;
        }
      }
    }
    return ContentService.createTextOutput(
      JSON.stringify({ alerts: alerts, resetReadVersion: resetReadVersion }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ alerts: [], error: err.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- RSVP: POST appends a new row (duplicates allowed; use latest) ---
function doPost(e) {
  try {
    if (!e || !e.postData) {
      throw new Error("No POST data received");
    }
    var rawBody =
      e.postData.contents ||
      (typeof e.postData.getDataAsString === "function"
        ? e.postData.getDataAsString()
        : "");
    if (!rawBody) {
      throw new Error("POST body is empty");
    }
    var data = JSON.parse(rawBody);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("RSVPs") || ss.getSheets()[0];

    var row = [
      data.timestamp || new Date().toISOString(),
      data.name || "",
      data.phone || "",
      data.attending || "",
      data.guests || "1",
      data.veg != null ? data.veg : "",
      data.nonVeg != null ? data.nonVeg : "",
      data.drinkPreference || "",
      data.gangaPoojaDrink || "",
      data.consent || "No",
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", message: "RSVP saved!" }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() }),
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
        veg: 1,
        nonVeg: 1,
        drinkPreference: "Whiskey",
        gangaPoojaDrink: "Cocktails",
        consent: "Yes",
      }),
    },
  };

  var result = doPost(testEvent);
  Logger.log(result.getContent());
}
