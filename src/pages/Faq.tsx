
const Faq = () => {
  const faqs = [
    {
      question: "What is Voice AI?",
      answer: "Voice AI combines artificial intelligence with voice technology to create natural, conversational experiences between humans and computers."
    },
    {
      question: "How do I get started?",
      answer: "Simply sign up for an account, create your first AI assistant, and start making calls within minutes."
    },
    {
      question: "What languages are supported?",
      answer: "We currently support English with plans to add more languages in the future."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! We offer a 14-day free trial with no credit card required."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
      
      <div className="max-w-3xl mx-auto space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
            <p className="text-gray-600">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Faq;
