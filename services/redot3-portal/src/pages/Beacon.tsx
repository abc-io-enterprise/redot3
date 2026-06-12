import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Radio,
  MapPin,
  Shield,
  CloudRain,
  Thermometer,
  Wind,
  Navigation,
  Siren,
  Send,
  Check,
} from 'lucide-react';

export function Beacon() {
  const [location, setLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awarenessData, setAwarenessData] = useState<any>(null);
  const [radius, setRadius] = useState('10');
  const [emergencySent, setEmergencySent] = useState(false);

  const handleShareLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          setLocation(coords);
          // Simulate awareness data
          setAwarenessData({
            weather: {
              temp: '72°F',
              condition: 'Partly Cloudy',
              humidity: '65%',
              wind: '8 mph SW',
            },
            alerts: [
              { type: 'info', message: 'No active weather alerts in your area' },
            ],
            nearby: [
              { name: 'Community Center', distance: '0.8 mi' },
              { name: 'Fire Station #4', distance: '1.2 mi' },
              { name: 'Public Library', distance: '0.5 mi' },
            ],
          });
          setLoading(false);
        },
        () => {
          setLocation('Location access denied');
          setLoading(false);
        }
      );
    } else {
      setLocation('Geolocation not supported');
      setLoading(false);
    }
  };

  const handleEmergencyBeacon = () => {
    setEmergencySent(true);
    setTimeout(() => setEmergencySent(false), 5000);
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Radio className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Free Public Awareness Beacon</h1>
            <p className="text-muted-foreground mb-6">
              Get weather, public safety alerts, nearby suggestions, and local events for your location. 
              <span className="text-foreground font-medium"> No account required.</span>
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-400">
                <Shield className="h-4 w-4 inline mr-1" />
                Your location is only used when you click the button below. We do not track you, 
                store your location, or notify anyone where you are.
              </p>
            </div>
          </div>

          {/* Location Sharing */}
          <Card className="bg-glass border-border/50 mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Search radius</label>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="bg-white/5 border border-border/50 rounded-md px-3 py-2 text-sm w-full sm:w-auto"
                  >
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="25">25 km</option>
                    <option value="50">50 km</option>
                  </select>
                </div>
                <Button
                  onClick={handleShareLocation}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                >
                  {loading ? (
                    <Navigation className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  Share My Location & Get Info
                </Button>
              </div>
              {location && (
                <div className="text-xs text-muted-foreground">
                  Location: <code className="text-cyan-400">{location}</code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Awareness Data */}
          {awarenessData && (
            <div className="space-y-4 mb-8 animate-fade-in">
              <h3 className="text-sm font-semibold text-center">Local Awareness Information</h3>
              
              {/* Weather */}
              <Card className="bg-glass border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Weather</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <Thermometer className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                      <div className="text-sm font-bold">{awarenessData.weather.temp}</div>
                      <div className="text-[10px] text-muted-foreground">Temperature</div>
                    </div>
                    <div className="text-center">
                      <CloudRain className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                      <div className="text-sm font-bold">{awarenessData.weather.condition}</div>
                      <div className="text-[10px] text-muted-foreground">Condition</div>
                    </div>
                    <div className="text-center">
                      <Wind className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
                      <div className="text-sm font-bold">{awarenessData.weather.wind}</div>
                      <div className="text-[10px] text-muted-foreground">Wind</div>
                    </div>
                    <div className="text-center">
                      <Shield className="h-5 w-5 text-green-400 mx-auto mb-1" />
                      <div className="text-sm font-bold">{awarenessData.weather.humidity}</div>
                      <div className="text-[10px] text-muted-foreground">Humidity</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nearby */}
              <Card className="bg-glass border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Nearby</h4>
                  <div className="space-y-2">
                    {awarenessData.nearby.map((place: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{place.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5">{place.distance}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Emergency Beacon */}
          <Card className="bg-glass border-border/50 border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Siren className="h-5 w-5 text-red-400" />
                <h3 className="text-sm font-semibold">Emergency Beacon (Optional)</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                If you are in an emergency and want to broadcast your location to responders, 
                use the form below. This is voluntary and not required for the free awareness service.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Device Type</label>
                  <select className="bg-white/5 border border-border/50 rounded-md px-3 py-2 text-sm w-full">
                    <option>Mobile</option>
                    <option>Wearable</option>
                    <option>Vehicle</option>
                    <option>Drone</option>
                    <option>Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Beacon Type</label>
                  <select className="bg-white/5 border border-border/50 rounded-md px-3 py-2 text-sm w-full">
                    <option>Emergency</option>
                    <option>Transit</option>
                    <option>SOS</option>
                  </select>
                </div>
              </div>
              <Textarea
                placeholder="Message (optional)..."
                className="bg-white/5 border-border/50 mb-3 text-sm"
              />
              <Button
                onClick={handleEmergencyBeacon}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 w-full"
              >
                {emergencySent ? (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Emergency Beacon Emitted
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Emit Emergency Beacon with Location
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
