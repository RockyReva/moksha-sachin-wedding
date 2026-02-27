// ===========================================================================
// GOOGLE APPS SCRIPT — RSVP TO GOOGLE SHEETS
// ===========================================================================
//
// HOW TO SET THIS UP:
//
// 1. Go to https://sheets.google.com and create a new spreadsheet
// 2. Name it "Moksha & Sachin Wedding RSVPs"
// 3. Add these headers in Row 1:
//    A1: Timestamp | B1: Name | C1: Phone | D1: Attending | E1: Guests
//    F1: Meal | G1: Drink | H1: Dietary | I1: Plus One Name
//
// 4. Click Extensions → Apps Script
// 5. Delete any existing code and paste ALL of this code
// 6. Click Deploy → New Deployment
// 7. Choose "Web app" as the type
// 8. Set "Execute as" → "Me"
// 9. Set "Who has access" → "Anyone"
// 10. Click Deploy and copy the Web App URL
// 11. Paste that URL into src/firebase.js as GOOGLE_SHEETS_URL
//
// ===========================================================================

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
