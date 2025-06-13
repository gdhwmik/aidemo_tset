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
const { GoogleGenAI } = require("@google/genai");
admin.initializeApp();

//helloWorld
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.json({msg: "Hello, Jayden!"});
});

//addNote
exports.addNote = functions.https.onRequest(async (req, res) => {
  const text = req.query.text || "empty";
  const docRef = await admin.firestore().collection("notes").add({text, ts: Date.now()});
  res.json({id: docRef.id, text});
});

//dailyGemini
const text = `請用繁體中文寫一句有象徵意義的短語（不超過20字），
主題與AI、學習、創造力或未來有關。
風格要像詩句、嚴言、或書法對聯那樣簡練而有畫面感，
讓人看完會引發思考，不要使用口號語氣或直白描述。
請只回一句話。`
exports.dailyGeminiInspiration = functions.pubsub.schedule("every 24 hours").onRun(async () => {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: "aidemo-jayden-a3d67",
    location: "us-central1",
  });

  const model = "gemini-1.5-flash";

  const generationConfig = {
    maxOutputTokens: 512,
    temperature: 0.8,
    topP: 1,
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
    ],
  };

  const req = {
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text
          },
        ],
      },
    ],
    config: generationConfig,
  };

  try {
    const streamingResp = await ai.models.generateContentStream(req);
    let result = "";

    for await (const chunk of streamingResp) {
      if (chunk.text) result += chunk.text;
    }

    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    await admin.firestore().collection("inspirations").doc(date).set({
      text: result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ 成功儲存語錄：${result}`);
  } catch (err) {
    console.error("❌ 生成語錄時發生錯誤：", err.message);
  }
});

//test
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
