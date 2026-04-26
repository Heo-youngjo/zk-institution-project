const { buildPoseidon } = require("circomlibjs");
const { createObjectCsvWriter } = require("csv-writer");
const crypto = require("crypto");

async function generateData() {
    // 1. Poseidon 해시 함수 초기화
    const poseidon = await buildPoseidon();

    // 2. CSV 파일 저장 설정
    const csvWriter = createObjectCsvWriter({
        path: 'agencies_data.csv',
        header: [
            { id: 'index', title: 'Index' },
            { id: 'name', title: 'Agency_Name' },
            { id: 'secret', title: 'Secret_Key_SK' },
            { id: 'nullifier', title: 'Identity_Nullifier_IDN' },
            { id: 'commitment', title: 'Commitment_Leaf' }
        ]
    });

    const agencies = [
        "KB Securities", "Future Asset", "NH Invest", "Samsung Finance", "Korea Invest",
        "Shinhan Bank", "Hana Bank", "Woori Bank", "IBK Industrial", "Kakao Bank",
        "Toss Bank", "K-Bank", "Dunamu", "Bithumb", "Korbit", "Coinone",
        "Gopax", "Hanwha Asset", "Mirae Global", "KB Asset", "Samsung Asset",
        "Kyobo Life", "Hanwha Life", "Meritz Fire", "DB Insurance", "IMM Private",
        "MBK Partners", "STIC Invest", "Softbank Korea", "Hashed", "DSRV Labs", "Lambda256"
    ];

    const records = [];

    console.log("🚀 가상 기관 데이터 생성 및 Poseidon 해싱 시작...");

    for (let i = 0; i < agencies.length; i++) {
        // ZK 회로 내에서 안전하도록 31바이트 난수 생성
        const secret = '0x' + crypto.randomBytes(31).toString('hex');
        const nullifier = '0x' + crypto.randomBytes(31).toString('hex');

        // Poseidon(Secret, Nullifier) 해시 계산
        const hashResult = poseidon([BigInt(secret), BigInt(nullifier)]);
        
        // 해시 결과값을 16진수 문자열로 변환
        const commitment = '0x' + poseidon.F.toString(hashResult, 16);

        records.push({
            index: i,
            name: agencies[i],
            secret: secret,
            nullifier: nullifier,
            commitment: commitment
        });
    }

    // 3. CSV 파일 쓰기
    await csvWriter.writeRecords(records);
    console.log("✅ 생성 완료: agencies_data.csv 파일을 확인하세요.");
}

generateData().catch(console.error);