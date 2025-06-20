"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateAndSanitizeAdmin } from '@/lib/security';
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Registration {
  userId: string;
  name: string;
  pluga: string;
  team: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

interface GroupedRegistrations {
  [pluga: string]: {
    [team: string]: Registration[];
  };
}

export default function Panel() {
  const { theme } = useTheme();
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbData, setDbData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showNoChallengeDialog, setShowNoChallengeDialog] = useState(false);

  useEffect(() => {
    fetchRegistrations();
    fetchDbData();
  }, []);

  const fetchRegistrations = async () => {
    console.log('Fetching registrations...');
    try {
      const response = await fetch('/api/register', {
        credentials: 'include'
      });
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        console.error('Response not OK:', response.status);
        setRegistrations([]);
        return;
      }

      const data = await response.json();
      console.log('Received data:', data);

      if (!Array.isArray(data)) {
        console.error('Data is not an array:', data);
        setRegistrations([]);
        return;
      }

      setRegistrations(data);
      setMessage('');
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setRegistrations([]);
      setMessage('');
    }
  };

  const fetchDbData = async () => {
    try {
      const response = await fetch('/api/db');
      if (!response.ok) {
        throw new Error('Failed to fetch database');
      }
      const data = await response.json();
      setDbData(data);
      setEditedData(data);
      setJsonError(null);

      if (!data.challenges || data.challenges.length === 0) {
        setShowNoChallengeDialog(true);
      }
    } catch (error) {
      console.error('Error fetching database:', error);
      setJsonError('Failed to load database data');
    }
  };

  const handleRegistrationAction = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch('/api/register', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update registration');
      }

      await fetchRegistrations();
      setMessage(`ההרשמה עודכנה בהצלחה ל${status === 'approved' ? 'מאושר' : 'נדחה'}`);
    } catch (error) {
      console.error('Error updating registration:', error);
      setMessage('שגיאה בעדכון ההרשמה');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const answers = answer.split(',').map(a => a.trim()).filter(a => a.length > 0);
      
      const validationResult = validateAndSanitizeAdmin({ answer: answers });
      if (!validationResult || !validationResult.answer) {
        setMessage('שגיאה בוולידציה');
        return;
      }

      if (!image) {
        setMessage("נדרש להעלות תמונה");
        return;
      }

      const formData = new FormData();
      formData.append("image", image);
      formData.append("answer", JSON.stringify(validationResult.answer));
      formData.append("question", question);

      console.log('Submitting challenge with:', {
        imageSize: image.size,
        imageType: image.type,
        answers: validationResult.answer,
        question: question || 'No question provided'
      });

      const response = await fetch("/api/challenge", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create challenge");
      }

      setMessage("האתגר נוצר בהצלחה");
      setImage(null);
      setAnswer("");
      setQuestion("");
      setPreviewUrl(null);
      router.push("/challenge");
    } catch (error) {
      console.error("Error creating challenge:", error);
      setMessage(error instanceof Error ? error.message : "שגיאה ביצירת האתגר");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEraseData = async () => {
    setIsErasing(true);
    try {
      const response = await fetch("/api/challenge/erase", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to erase data");
      }

      setMessage("כל הנתונים נמחקו בהצלחה");
    } catch (error) {
      console.error("Error erasing data:", error);
      setMessage("שגיאה במחיקת הנתונים");
    } finally {
      setIsErasing(false);
    }
  };

  const handleDbChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const newData = JSON.parse(e.target.value);
      
      if (!newData.registrations || !newData.challenges || !newData.guesses) {
        setJsonError('Invalid data structure: missing required fields');
        return;
      }

      if (!Array.isArray(newData.registrations)) {
        setJsonError('Invalid registrations: must be an array');
        return;
      }

      if (!Array.isArray(newData.challenges)) {
        setJsonError('Invalid challenges: must be an array');
        return;
      }

      if (!Array.isArray(newData.guesses)) {
        setJsonError('Invalid guesses: must be an array');
        return;
      }

      setEditedData(newData);
      setJsonError(null);
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  const handleSaveDb = async () => {
    if (jsonError) {
      return;
    }

    try {
      const dataToSave = {
        registrations: editedData.registrations || [],
        challenges: editedData.challenges || [],
        guesses: editedData.guesses || []
      };

      const response = await fetch('/api/db', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save database');
      }

      await fetchDbData();
      setIsEditing(false);
      setJsonError(null);
      setMessage('Database updated successfully');
    } catch (error) {
      console.error('Error saving database:', error);
      setJsonError(error instanceof Error ? error.message : 'Failed to save database changes');
    }
  };

  const groupRegistrations = (regs: Registration[]): GroupedRegistrations => {
    return regs.reduce((acc, reg) => {
      if (!acc[reg.pluga]) {
        acc[reg.pluga] = {};
      }
      if (!acc[reg.pluga][reg.team]) {
        acc[reg.pluga][reg.team] = [];
      }
      acc[reg.pluga][reg.team].push(reg);
      return acc;
    }, {} as GroupedRegistrations);
  };

  const groupedRegistrations = useMemo(() => {
    const groups = groupRegistrations(registrations);
    return Object.entries(groups).map(([pluga, teams]) => ({
      pluga,
      teams: Object.entries(teams).map(([team, registrations]) => ({
        team,
        registrations,
      })),
    }));
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    if (!searchQuery) {
      return groupedRegistrations.flatMap(group => 
        group.teams.flatMap(team => 
          team.registrations.filter(reg => reg.status === 'pending')
        )
      );
    }

    return groupedRegistrations.flatMap(group => 
      group.teams.flatMap(team => 
        team.registrations.filter(reg => 
          reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reg.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reg.pluga.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reg.team.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    );
  }, [groupedRegistrations, searchQuery]);

  return (
    <main className="relative min-h-screen p-4 sm:p-6 md:p-10 flex items-center justify-center" dir="rtl">
      <Card className="p-0 w-full max-w-3xl text-center shadow-none border-none">
        <MagicCard
          gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
          className="p-0"
        >
          <CardHeader className="border-b border-border p-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">פאנל אדמינים</h1>
              <Button
                variant="outline"
                onClick={() => {
                  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                  window.location.href = '/challenge';
                }}
              >
                חזרה לבית
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="challenge" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="challenge">הגדרות אתגר</TabsTrigger>
                <TabsTrigger value="users">ניהול משתמשים</TabsTrigger>
                <TabsTrigger value="database">ניהול בסיס נתונים</TabsTrigger>
              </TabsList>

              <TabsContent value="challenge" className="h-[450px] overflow-y-auto space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <h2 className="text-xl font-semibold">ניהול אתגרים</h2>
                  </div>

                  <div className="space-y-4">
                    <Card className="py-6">
                      <CardHeader>
                        <CardTitle>יצירת אתגר חדש</CardTitle>
                        <CardDescription>
                          העלה תמונה וציין את התשובות הנכונות
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="space-y-2 text-right">
                            <div className="flex justify-end">
                              <Label htmlFor="image" className="text-right">תמונה</Label>
                            </div>
                            <Input
                              id="image"
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              required
                              dir="rtl"
                              className="text-right"
                            />
                          </div>
                          <div className="space-y-2 text-right">
                            <div className="flex justify-end">
                              <Label htmlFor="question" className="text-right">שאלה</Label>
                            </div>
                            <Input
                              id="question"
                              value={question}
                              onChange={(e) => setQuestion(e.target.value)}
                              placeholder="הכנס את השאלה של האתגר"
                              dir="rtl"
                              className="text-right"
                            />
                          </div>
                          <div className="space-y-2 text-right">
                            <div className="flex justify-end">
                              <Label htmlFor="answers" className="text-right">תשובות נכונות (מופרדות בפסיק)</Label>
                            </div>
                            <Input
                              id="answers"
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                              placeholder="תשובה 1, תשובה 2, תשובה 3"
                              required
                              dir="rtl"
                              className="text-right"
                            />
                          </div>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'שולח...' : 'צור אתגר'}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    <Dialog open={showNoChallengeDialog} onOpenChange={setShowNoChallengeDialog}>
                      <DialogContent>
                        <DialogHeader className="mt-5">
                          <DialogTitle dir="rtl">אין אתגר פעיל</DialogTitle>
                          <DialogDescription dir="rtl">
                            כרגע אין אתגר פעיל במערכת. אנא צור אתגר חדש באמצעות הטופס למעלה.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button onClick={() => setShowNoChallengeDialog(false)}>
                            הבנתי
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="users" className="h-[450px]">
                <div className="flex flex-col h-full">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">ניהול הרשמות</h2>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={() => setSearchQuery('')}
                          className="flex-1 sm:flex-none"
                        >
                          נקה חיפוש
                        </Button>
                      </div>
                      <div className="flex-1 w-full">
                        <Input
                          placeholder="חיפוש לפי שם, מספר אישי, פלוגה או צוות..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          dir="rtl"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto mt-4">
                    {filteredRegistrations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'לא נמצאו תוצאות לחיפוש' : 'אין רישומים ממתינים'}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredRegistrations.map((reg) => (
                          <div
                            key={reg.userId}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/50 gap-3"
                          >
                            <div className="flex items-center gap-2">
                              {reg.status === 'pending' && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleRegistrationAction(reg.userId, "approved")}
                                    className="bg-green-400 hover:bg-green-500 text-white border-none"
                                  >
                                    אישור
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleRegistrationAction(reg.userId, "rejected")}
                                    className="bg-red-400 hover:bg-red-500 text-white border-none"
                                  >
                                    דחייה
                                  </Button>
                                </>
                              )}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                  >
                                    פרטים
                                  </Button>
                                </DialogTrigger>
                                <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="mt-5" dir="rtl">פרטי משתמש</DialogTitle>
                                    <DialogDescription dir="rtl">
                                      כל המידע על המשתמש
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-3 text-right justify-start max-w-md">
                                    <div>
                                      <p className="font-medium">שם</p>
                                      <p className="text-muted-foreground">{reg.name}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">מספר אישי</p>
                                      <p className="text-muted-foreground">{reg.userId}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">פלוגה</p>
                                      <p className="text-muted-foreground">{reg.pluga}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">צוות</p>
                                      <p className="text-muted-foreground">{reg.team}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">סטטוס</p>
                                      <p className={`${
                                        reg.status === 'approved' ? 'text-green-500' :
                                        reg.status === 'rejected' ? 'text-red-500' :
                                        'text-muted-foreground'
                                      }`}>
                                        {reg.status === 'pending' ? 'ממתין' :
                                         reg.status === 'approved' ? 'מאושר' :
                                         'נדחה'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium">תאריך הרשמה</p>
                                      <p className="text-muted-foreground">
                                        {new Date(reg.timestamp).toLocaleString('he-IL')}
                                      </p>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{reg.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {reg.pluga} | {reg.team}
                              </p>
                              <p className={`text-sm ${
                                reg.status === 'approved' ? 'text-green-500' :
                                reg.status === 'rejected' ? 'text-red-500' :
                                'text-muted-foreground'
                              }`}>
                                סטטוס: {
                                  reg.status === 'pending' ? 'ממתין' :
                                  reg.status === 'approved' ? 'מאושר' :
                                  'נדחה'
                                }
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="database" className="h-[450px] overflow-y-auto space-y-4">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditedData(dbData);
                              setIsEditing(false);
                            }}
                          >
                            ביטול
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveDb}
                          >
                            שמור
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRegistrations([]);
                              fetchRegistrations();
                              fetchDbData();
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            רענן
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                          >
                            ערוך
                          </Button>
                        </>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold">ניהול בסיס הנתונים</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border bg-card">
                      {isEditing ? (
                        <div className="relative">
                          <textarea
                            className={`w-full h-[330px] p-4 font-mono text-sm bg-transparent resize-none focus:outline-none ${
                              jsonError ? 'border-red-500' : ''
                            }`}
                            value={JSON.stringify(editedData, null, 2)}
                            onChange={handleDbChange}
                            dir="ltr"
                            style={{ textAlign: 'left' }}
                          />
                          {jsonError && (
                            <div className="absolute bottom-2 right-2 text-red-500 text-sm bg-red-50 px-2 py-1 rounded">
                              {jsonError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className="text-sm overflow-auto h-[330px] p-4" style={{ textAlign: 'left' }}>
                          {dbData ? JSON.stringify(dbData, null, 2) : 'Loading...'}
                        </pre>
                      )}
                    </div>

                    {jsonError && (
                      <div className="text-red-500 text-sm">
                        {jsonError}
                      </div>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full" disabled={isErasing}>
                          {isErasing ? 'מוחק...' : 'מחק את כל הנתונים'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle dir="rtl">האם אתה בטוח?</AlertDialogTitle>
                          <AlertDialogDescription dir="rtl">
                            פעולה זו תמחק את כל הנתונים כולל אתגרים וניחושים. לא ניתן לבטל פעולה זו.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="w-full flex flex-row gap-5" dir="rtl">
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction onClick={handleEraseData} className="bg-red-500 hover:bg-red-600">
                            מחק הכל
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </MagicCard>
      </Card>
    </main>
  );
} 