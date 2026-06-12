import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Ticket,
  BookOpen,
  MessageCircle,
  Clock,
  Check,
  Send,
  Search,
} from 'lucide-react';

const tickets = [
  { id: 'T-1024', subject: 'API rate limit clarification', status: 'open', priority: 'normal', created: '2 hours ago' },
  { id: 'T-1023', subject: 'Cellular backup gateway setup', status: 'resolved', priority: 'high', created: '1 day ago' },
  { id: 'T-1022', subject: 'Billing question — Pro plan', status: 'open', priority: 'low', created: '2 days ago' },
];

const faqs = [
  { q: 'How do I upgrade my plan?', a: 'Go to the Pricing page and select the plan you want to upgrade to. Changes take effect immediately.' },
  { q: 'What is the 5x5c25 system?', a: 'It is ABC-IO\'s interfacing architecture: 5 solution families x 5 service tiers = 25 capability modules.' },
  { q: 'How does the beacon service work?', a: 'The beacon uses your device\'s GPS to provide local awareness information without storing your location.' },
  { q: 'Can I deploy ABC-IO on-premise?', a: 'Yes, the complete system ships with 5 deployment environments including local dev and production.' },
];

export function CustomerArea() {
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = () => {
    if (!ticketSubject.trim() || !ticketBody.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTicketSubject('');
      setTicketBody('');
    }, 3000);
  };

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col">
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Customer Area</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Submit support tickets, browse the knowledge base, and get help from our team.
            </p>
          </div>

          <Tabs defaultValue="tickets" className="space-y-6">
            <TabsList className="bg-glass border border-border/50">
              <TabsTrigger value="tickets" className="text-xs">
                <Ticket className="h-3.5 w-3.5 mr-1.5" />
                My Tickets
              </TabsTrigger>
              <TabsTrigger value="kb" className="text-xs">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-xs">
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Contact Support
              </TabsTrigger>
            </TabsList>

            {/* Tickets Tab */}
            <TabsContent value="tickets">
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="bg-glass border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 ${
                              ticket.status === 'open'
                                ? 'border-yellow-500/30 text-yellow-400'
                                : 'border-green-500/30 text-green-400'
                            }`}
                          >
                            {ticket.status}
                          </Badge>
                          <div>
                            <div className="text-sm font-medium">{ticket.subject}</div>
                            <div className="text-xs text-muted-foreground">{ticket.id}</div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ticket.created}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Knowledge Base Tab */}
            <TabsContent value="kb">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search knowledge base..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-glass border-border/50"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {filteredFaqs.map((faq, i) => (
                  <Card key={i} className="bg-glass border-border/50">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-1">{faq.q}</h3>
                      <p className="text-xs text-muted-foreground">{faq.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact">
              <Card className="bg-glass border-border/50">
                <CardContent className="p-6 space-y-4">
                  {submitted ? (
                    <div className="text-center py-8">
                      <Check className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold mb-1">Ticket Submitted!</h3>
                      <p className="text-sm text-muted-foreground">
                        We\'ll get back to you within 24 hours.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">Subject</label>
                        <Input
                          value={ticketSubject}
                          onChange={(e) => setTicketSubject(e.target.value)}
                          placeholder="What can we help you with?"
                          className="bg-white/5"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">Message</label>
                        <Textarea
                          value={ticketBody}
                          onChange={(e) => setTicketBody(e.target.value)}
                          placeholder="Describe your issue in detail..."
                          className="bg-white/5 min-h-[120px]"
                        />
                      </div>
                      <Button
                        onClick={handleSubmit}
                        className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit Ticket
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
