interface PeopleAnalysis {
    peopleInfo: string;
    peoplePose: string;
    peopleFaces: string;
    peopleEmotions: string;
  }
  
export function analyzeImage(test: string): PeopleAnalysis {
    const parts = test.split(/\d+\.\s+/).filter(part => part.trim() !== '');
  
    return {
      peopleInfo: parts[0],
      peoplePose: parts[1],
      peopleFaces: parts[2],
      peopleEmotions: parts[3]
    };
  }