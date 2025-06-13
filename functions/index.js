/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {VertexAI} = require("@google-cloud/vertexai");
const vertexai = new VertexAI({project: "aidemo-jayden-a3d67", location: "us-central1"});
admin.initializeApp();

// helloWorld
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.json({msg: "Hello, Jayden!"});
});

// addNote
exports.addNote = functions.https.onRequest(async (req, res) => {
  const text = req.query.text || "empty";
  const docRef = await admin.firestore().collection("notes").add({text, ts: Date.now()});
  res.json({id: docRef.id, text});
});

// dailyGemini
const prompt = `請用繁體中文寫一句有象徵意義的短語（不超過20字），
主題與AI、學習、創造力或未來有關。
風格要像詩句、嚴言、或書法對聯那樣簡練而有畫面感，
讓人看完會引發思考，不要使用口號語氣或直白描述。
請只回一句話。`;
exports.dailyGeminiInspiration = onSchedule("every 24 hours", async (event) => {
  const model = "gemini-1.5-flash";
  const generativeModel = vertexai.getGenerativeModel({
    model: model,
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0.9,
    },
    safetySettings: [
      {category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE"},
    ],
  });

  const result = await generativeModel.generateContent({
    contents: [{role: "user", parts: [{text: prompt}]}],
  });

  let text = "(產生失敗)";
  try {
    text = result.response.candidates[0].content.parts[0].text || text;
  } catch (e) {
    console.warn("⚠️ 回應結構異常，已使用預設語錄");
  }
  const date = new Date().toISOString().split("T")[0];
  await admin.firestore().collection("inspirations").doc(date).set({
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("✅ 成功儲存語錄：", text);
});


// test
exports.testGeminiInspiration = functions.https.onRequest(async (req, res) => {
  // 使用上方相同邏輯來生成語錄
  res.send("這是測試用的 Gemini 語錄函式，可以成功觸發就代表模型正常運作");
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
