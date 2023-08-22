import natural from 'natural';
import { stopWords } from '../data/stopWords.js';
export const extractKeywords = (searchTerm) => {
    const tokenizer = new natural.AggressiveTokenizerVi();
    const keywords = tokenizer.tokenize(searchTerm).filter((keyword) => !stopWords.includes(keyword));
    return keywords;
};
