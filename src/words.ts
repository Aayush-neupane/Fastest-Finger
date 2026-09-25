export type Language = 'en' | 'ne'

export const ENGLISH_WORDS: string[] = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
  'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
  'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
  'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'water',
  'house', 'school', 'friend', 'book', 'light', 'morning', 'night', 'happy', 'small', 'large',
  'quick', 'slow', 'city', 'village', 'road', 'food', 'family', 'child', 'mother', 'father',
  'study', 'learn', 'write', 'read', 'play', 'run', 'walk', 'talk', 'listen', 'help',
  'today', 'tomorrow', 'always', 'never', 'every', 'place', 'where', 'here', 'many', 'much',
  'mountain', 'river', 'flower', 'tree', 'bird', 'music', 'dream', 'smile', 'world', 'life',
]

export const NEPALI_WORDS: string[] = [
  'नेपाल', 'काठमाडौं', 'पोखरा', 'चितवन', 'झापा', 'दमक', 'धरान', 'बुटवल', 'धनगढी', 'हेटौंडा',
  'पानी', 'आगो', 'हावा', 'माटो', 'आकाश', 'घाम', 'जुन', 'तारा', 'बादल', 'वर्षा',
  'घर', 'ढोका', 'झ्याल', 'कोठा', 'भान्सा', 'भात', 'दाल', 'तरकारी', 'रोटी', 'चिया',
  'आमा', 'बुबा', 'दाजु', 'भाइ', 'दिदी', 'बहिनी', 'काका', 'काकी', 'साथी', 'छिमेकी',
  'गाउँ', 'सहर', 'बजार', 'पसल', 'पैसा', 'काम', 'पढाइ', 'लेखाइ', 'परीक्षा', 'ज्ञान',
  'स्कुल', 'कलेज', 'शिक्षक', 'विद्यार्थी', 'किताब', 'कापी', 'कलम', 'नतिजा', 'कक्षा', 'पाठ',
  'माया', 'खुशी', 'दुःख', 'हाँसो', 'मन', 'मुटु', 'सपना', 'आशा', 'विश्वास', 'शान्ति',
  'खाना', 'नास्ता', 'खाजा', 'दुध', 'फलफूल', 'स्याउ', 'केरा', 'सुन्तला', 'आँप', 'अंगुर',
  'बाटो', 'गाडी', 'बस', 'मोटर', 'साइकल', 'पुल', 'मन्दिर', 'विद्यालय', 'अस्पताल', 'पार्क',
  'कुकुर', 'बिरालो', 'गाई', 'भैँसी', 'बाख्रा', 'घोडा', 'चरा', 'माछा', 'हात्ती', 'बाँदर',
  'रातो', 'नीलो', 'हरियो', 'पहेँलो', 'सेतो', 'कालो', 'ठूलो', 'सानो', 'राम्रो', 'नयाँ',
  'आज', 'भोलि', 'हिजो', 'बिहान', 'दिउँसो', 'बेलुका', 'राति', 'अहिले', 'पछि', 'पहिले',
  'खानु', 'जानु', 'आउनु', 'बस्नु', 'हिँड्नु', 'दौडनु', 'पढ्नु', 'लेख्नु', 'हेर्नु', 'सुन्नु',
  'गर्नु', 'दिनु', 'लिनु', 'भन्नु', 'सोध्नु', 'खेल्नु', 'नाच्नु', 'गाउनु', 'हास्नु', 'रुनु',
  'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ', 'दस',
  'म', 'तिमी', 'उनी', 'हामी', 'मेरो', 'तिम्रो', 'उसको', 'हाम्रो', 'आफ्नो', 'सबै',
]

export function randomWords(lang: Language, count: number): string[] {
  const pool = lang === 'ne' ? NEPALI_WORDS : ENGLISH_WORDS
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    out.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return out
}
