exports.handler = async (event) => {
    const { prompt } = JSON.parse(event.body);
  
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500
      }),
    });
  
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ content: [{ text: data.choices[0].message.content }] })
    };
  };