import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, setDoc, getDoc, deleteDoc,
  collection, addDoc, serverTimestamp, getDocs, writeBatch,
  query, orderBy, onSnapshot, limit
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2-0SV6TbhQJXuMpg73FVRaMJjzA3TGwz0",
  authDomain: "game-0226.firebaseapp.com",
  projectId: "game-0226",
  storageBucket: "game-0226.firebasestorage.app",
  messagingSenderId: "3161543718",
  appId: "1:3161543718:web:dd0f6b3d8278ab8d2402e7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const fs = { 
  doc,
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot, 
  limit,
  getDocs,
  writeBatch,
  deleteDoc
};

// 房主创建房间时调用
export const createRoom = async (roomId, hostName) => {
  try {
    const roomRef = doc(db, "rooms", roomId);
    await setDoc(roomRef, {
      hostName: hostName || "房主",
      createdAt: Date.now(),
      active: true
    });
  } catch (err) {
    console.error("创建房间失败:", err);
  }
};

// 玩家加入房间前验证房间是否存在
export const checkRoomExists = async (roomId) => {
  try {
    if (!roomId) return false;
    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
    return snap.exists() && snap.data()?.active !== false;
  } catch (err) {
    console.error("检查房间失败:", err);
    return true;
  }
};

// 结束游戏 / 房间关闭时可调用
export const closeRoom = async (roomId) => {
  try {
    if (!roomId) return;
    const roomRef = doc(db, "rooms", roomId);
    await setDoc(roomRef, { active: false }, { merge: true });
  } catch (err) {
    console.error("关闭房间失败:", err);
  }
};

// 更新房间游戏状态（歌单、当前题目索引、播放状态、规则等）
export const updateRoomState = async (roomId, data) => {
  try {
    if (!roomId || !data) return;
    const roomRef = doc(db, "rooms", roomId);
    await setDoc(roomRef, data, { merge: true });
  } catch (err) {
    console.error("更新房间状态失败:", err);
  }
};

// 读取房间当前状态
export const getRoomState = async (roomId) => {
  try {
    if (!roomId) return null;
    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("获取房间状态失败:", err);
    return null;
  }
};

// 将玩家写入房间的 players 子集合
export const addPlayerToRoom = async (roomId, playerId, data) => {
  try {
    if (!roomId || !playerId) return;
    const playerRef = doc(db, "rooms", roomId, "players", playerId);
    await setDoc(
      playerRef,
      { ...data, createdAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.error("添加玩家到房间失败:", err);
  }
};

// 从房间中移除一个玩家；如果房间已空，则删除房间及其子集合
export const removePlayerFromRoom = async (roomId, playerId) => {
  try {
    if (!roomId || !playerId) return;

    const playerRef = doc(db, "rooms", roomId, "players", playerId);
    await deleteDoc(playerRef);

    // 检查是否还有其他玩家
    const playersSnap = await getDocs(collection(db, "rooms", roomId, "players"));
    if (!playersSnap.empty) return;

    // 房间已经没人了：删除该房间下的所有子集合文档和房间本身
    const batch = writeBatch(db);

    const messagesSnap = await getDocs(collection(db, "rooms", roomId, "messages"));
    messagesSnap.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    playersSnap.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    batch.delete(doc(db, "rooms", roomId));

    await batch.commit();
    console.log(`房间 ${roomId} 已因无人在线被清理`);
  } catch (err) {
    console.error("移除玩家或清理房间失败:", err);
  }
};

// 清理所有「没有玩家」的房间（在 App 启动时调用一次，用于兜底清理）
export const cleanupEmptyRooms = async () => {
  try {
    const roomsSnap = await getDocs(collection(db, "rooms"));
    if (roomsSnap.empty) return;

    for (const roomDoc of roomsSnap.docs) {
      const roomId = roomDoc.id;
      const playersSnap = await getDocs(collection(db, "rooms", roomId, "players"));
      if (!playersSnap.empty) continue;

      const batch = writeBatch(db);

      const messagesSnap = await getDocs(collection(db, "rooms", roomId, "messages"));
      messagesSnap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      playersSnap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      batch.delete(doc(db, "rooms", roomId));
      await batch.commit();
      console.log(`Room ${roomId} cleaned up on startup (no players)`);
    }
  } catch (err) {
    console.error("清理空房间失败:", err);
  }
};

