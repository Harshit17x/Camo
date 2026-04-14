import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  CreditCard, 
  FileText, 
  Car, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  AlertCircle,
  Languages,
  Users,
  IndianRupee
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

type OnboardingStep = 'personal' | 'license' | 'vehicle' | 'payment' | 'success';

interface OnboardingData {
  licenseNo: string;
  profilePhoto: File | null;
  licensePhoto: File | null;
  vehicleType: string;
  vehicleNo: string;
  aadharNumber: string;
  aadharPhoto: File | null;
  rcBookNumber: string;
  rcBookPhoto: File | null;
  upiNumber: string;
}

const translations = {
  en: {
    title: 'Become a Driver',
    subtitle: 'Onboarding Process',
    personalInfo: 'Personal Information',
    profilePhoto: 'Profile Photo',
    aadharNumber: 'Aadhar Number',
    aadharPhoto: 'Aadhar Photo',
    drivingLicense: 'Driving License',
    licenseNumber: 'License Number',
    licensePhoto: 'License Photo',
    vehicleInfo: 'Vehicle Information',
    vehicleType: 'Vehicle Type',
    vehicleNumber: 'Vehicle Number',
    rcBookNumber: 'RC Book Number',
    rcBookPhoto: 'RC Book Photo',
    paymentDetails: 'Payment Details',
    upiId: 'UPI Number / ID',
    upiHint: 'This UPI ID will be used for all your earnings payouts.',
    successTitle: 'Registration Complete!',
    successDesc: 'Your documents have been submitted for verification. You can start accepting rides once an admin approves your profile.',
    goDashboard: 'Go to Dashboard',
    back: 'Back',
    continue: 'Continue',
    submit: 'Submit Registration',
    errorFill: 'Please fill all fields and upload required photos.',
    errorLicense: 'Please provide license number and photo.',
    errorVehicle: 'Please provide vehicle details and RC book photo.',
    errorPayment: 'Please provide your UPI number for payments.',
    auto: 'Auto Rickshaw',
    economy: 'Economy Cab (4 seater)',
    premium: 'Premium Cab (6 seater)',
    aadharPlaceholder: '12-digit Aadhar Number',
    licensePlaceholder: 'License Number',
    vehiclePlaceholder: 'GJ 01 XX 0000',
    rcPlaceholder: 'RC Book Number',
    upiPlaceholder: 'yourname@upi'
  },
  hi: {
    title: 'ड्राइवर बनें',
    subtitle: 'ऑनबोर्डिंग प्रक्रिया',
    personalInfo: 'व्यक्तिगत जानकारी',
    profilePhoto: 'प्रोफ़ाइल फोटो',
    aadharNumber: 'आधार नंबर',
    aadharPhoto: 'आधार फोटो',
    drivingLicense: 'ड्राइविंग लाइसेंस',
    licenseNumber: 'लाइसेंस नंबर',
    licensePhoto: 'लाइसेंस फोटो',
    vehicleInfo: 'वाहन की जानकारी',
    vehicleType: 'वाहन का प्रकार',
    vehicleNumber: 'वाहन नंबर',
    rcBookNumber: 'आरसी बुक नंबर',
    rcBookPhoto: 'आरसी बुक फोटो',
    paymentDetails: 'भुगतान विवरण',
    upiId: 'यूपीआई नंबर / आईडी',
    upiHint: 'इस यूपीआई आईडी का उपयोग आपकी सभी कमाई के भुगतान के लिए किया जाएगा।',
    successTitle: 'पंजीकरण पूरा हुआ!',
    successDesc: 'आपके दस्तावेज़ सत्यापन के लिए जमा कर दिए गए हैं। एक बार एडमिन द्वारा आपकी प्रोफ़ाइल स्वीकृत हो जाने के बाद आप सवारी स्वीकार करना शुरू कर सकते हैं।',
    goDashboard: 'डैशबोर्ड पर जाएं',
    back: 'पीछे',
    continue: 'जारी रखें',
    submit: 'पंजीकरण जमा करें',
    errorFill: 'कृपया सभी फ़ील्ड भरें और आवश्यक फ़ोटो अपलोड करें।',
    errorLicense: 'कृपया लाइसेंस नंबर और फोटो प्रदान करें।',
    errorVehicle: 'कृपया वाहन विवरण और आरसी बुक फोटो प्रदान करें।',
    errorPayment: 'कृपया भुगतान के लिए अपना यूपीआई नंबर प्रदान करें।',
    auto: 'ऑटो रिक्शा',
    economy: 'इकोनॉमी कैब (4 सीटर)',
    premium: 'प्रीमियम कैब (6 सीटर)',
    aadharPlaceholder: '12-अंकीय आधार संख्या',
    licensePlaceholder: 'लाइसेंस संख्या',
    vehiclePlaceholder: 'GJ 01 XX 0000',
    rcPlaceholder: 'आरसी बुक नंबर',
    upiPlaceholder: 'yourname@upi'
  },
  gu: {
    title: 'ડ્રાઇવર બનો',
    subtitle: 'ઓનબોર્ડિંગ પ્રક્રિયા',
    personalInfo: 'વ્યક્તિગત માહિતી',
    profilePhoto: 'પ્રોફાઇલ ફોટો',
    aadharNumber: 'આધાર નંબર',
    aadharPhoto: 'આધાર ફોટો',
    drivingLicense: 'ડ્રાઇવિંગ લાયસન્સ',
    licenseNumber: 'લાયસન્સ નંબર',
    licensePhoto: 'લાયસન્સ ફોટો',
    vehicleInfo: 'વાહનની માહિતી',
    vehicleType: 'વાહનનો પ્રકાર',
    vehicleNumber: 'વાહન નંબર',
    rcBookNumber: 'આરસી બુક નંબર',
    rcBookPhoto: 'આરસી બુક ફોટો',
    paymentDetails: 'ચુકવણી વિગતો',
    upiId: 'યુપીઆઈ નંબર / આઈડી',
    upiHint: 'આ યુપીઆઈ આઈડીનો ઉપયોગ તમારી બધી કમાણીની ચુકવણી માટે કરવામાં આવશે.',
    successTitle: 'નોંધણી પૂર્ણ થઈ!',
    successDesc: 'તમારા દસ્તાવેજો ચકાસણી માટે સબમિટ કરવામાં આવ્યા છે. એકવાર એડમિન તમારી પ્રોફાઇલ મંજૂર કરે પછી તમે સવારી સ્વીકારવાનું શરૂ કરી શકો છો.',
    goDashboard: 'ડેશબોર્ડ પર જાઓ',
    back: 'પાછળ',
    continue: 'ચાલુ રાખો',
    submit: 'નોંધણી સબમિટ કરો',
    errorFill: 'કૃપા કરીને બધી વિગતો ભરો અને જરૂરી ફોટા અપલોડ કરો.',
    errorLicense: 'કૃપા કરીને લાયસન્સ નંબર અને ફોટો આપો.',
    errorVehicle: 'કૃપા કરીને વાહનની વિગતો અને આરસી બુકનો ફોટો આપો.',
    errorPayment: 'કૃપા કરીને ચુકવણી માટે તમારો યુપીઆઈ નંબર આપો.',
    auto: 'ઓટો રિક્ષા',
    economy: 'ઇકોનોમી કેબ (4 સીટર)',
    premium: 'પ્રીમિયમ કેબ (6 સીટર)',
    aadharPlaceholder: '12-અંકનો આધાર નંબર',
    licensePlaceholder: 'લાયસન્સ નંબર',
    vehiclePlaceholder: 'GJ 01 XX 0000',
    rcPlaceholder: 'આરસી બુક નંબર',
    upiPlaceholder: 'yourname@upi'
  }
};

export default function DriverOnboarding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi' | 'gu'>('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const t = translations[language];

  // Fetch real vehicle categories from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vehicle_categories'), (snap) => {
      const fetchedCategories = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(cat => cat.isActive);
      
      setCategories(fetchedCategories);
      setCategoriesLoading(false);
      
      // Auto-select first category when loaded
      if (fetchedCategories.length > 0) {
        setFormData(prev => ({
          ...prev,
          vehicleType: prev.vehicleType && fetchedCategories.find(c => c.id === prev.vehicleType)
            ? prev.vehicleType
            : fetchedCategories[0].id
        }));
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkExisting = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'drivers', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          // ONLY skip if the profile is actually complete (has license and vehicle info)
          if (data.licenseNo && data.vehicleNo) {
            if (data.documents?.verified) {
              navigate('/');
            } else {
              setStep('success');
            }
          }
        }
      } catch (err) {
        console.error('Error checking existing driver profile:', err);
      }
    };
    checkExisting();
  }, [user, navigate]);
  
  const [formData, setFormData] = useState<OnboardingData>({
    licenseNo: '',
    profilePhoto: null,
    licensePhoto: null,
    vehicleType: 'Economy',
    vehicleNo: '',
    aadharNumber: '',
    aadharPhoto: null,
    rcBookNumber: '',
    rcBookPhoto: null,
    upiNumber: '',
  });

  const [previews, setPreviews] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof OnboardingData) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = () => {
    setError(null);
    if (step === 'personal') {
      if (!formData.aadharNumber || !formData.aadharPhoto || !formData.profilePhoto) {
        setError(t.errorFill);
        return false;
      }
    } else if (step === 'license') {
      if (!formData.licenseNo || !formData.licensePhoto) {
        setError(t.errorLicense);
        return false;
      }
    } else if (step === 'vehicle') {
      if (!formData.vehicleNo || !formData.rcBookNumber || !formData.rcBookPhoto) {
        setError(t.errorVehicle);
        return false;
      }
    } else if (step === 'payment') {
      if (!formData.upiNumber) {
        setError(t.errorPayment);
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      if (step === 'personal') setStep('license');
      else if (step === 'license') setStep('vehicle');
      else if (step === 'vehicle') setStep('payment');
    }
  };

  const prevStep = () => {
    if (step === 'license') setStep('personal');
    else if (step === 'vehicle') setStep('license');
    else if (step === 'payment') setStep('vehicle');
  };

  const handleSubmit = async () => {
    if (!validateStep() || !user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Upload all photos to Cloudinary
      const uploadPromises = [
        formData.profilePhoto ? uploadToCloudinary(formData.profilePhoto) : Promise.resolve(''),
        formData.licensePhoto ? uploadToCloudinary(formData.licensePhoto) : Promise.resolve(''),
        formData.aadharPhoto ? uploadToCloudinary(formData.aadharPhoto) : Promise.resolve(''),
        formData.rcBookPhoto ? uploadToCloudinary(formData.rcBookPhoto) : Promise.resolve(''),
      ];

      const [profileUrl, licenseUrl, aadharUrl, rcBookUrl] = await Promise.all(uploadPromises);

      // 2. Create driver document
      const driverData = {
        uid: user.uid,
        licenseNo: formData.licenseNo,
        profilePhoto: profileUrl,
        licensePhoto: licenseUrl,
        vehicleType: formData.vehicleType,
        vehicleNo: formData.vehicleNo,
        aadharNumber: formData.aadharNumber,
        aadharPhoto: aadharUrl,
        rcBookNumber: formData.rcBookNumber,
        rcBookPhoto: rcBookUrl,
        upiNumber: formData.upiNumber,
        status: 'online',
        rating: 5.0,
        totalRides: 0,
        earnings: 0,
        documents: {
          verified: false
        },
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'drivers', user.uid), driverData);

      // 3. Update user role to driver
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'driver',
        photoURL: profileUrl // Update profile photo too
      });

      setStep('success');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'An error occurred during onboarding. Please try again.');
      handleFirestoreError(err, OperationType.WRITE, `drivers/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'personal':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <User className="text-emerald-500" /> {t.personalInfo}
              </h2>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.profilePhoto}</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden">
                    {previews.profilePhoto ? (
                      <img src={previews.profilePhoto} alt="Profile Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="text-zinc-600" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'profilePhoto')}
                    className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.aadharNumber}</label>
                <input 
                  type="text" 
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleInputChange}
                  placeholder={t.aadharPlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.aadharPhoto}</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden">
                    {previews.aadharPhoto ? (
                      <img src={previews.aadharPhoto} alt="Aadhar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="text-zinc-600" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'aadharPhoto')}
                    className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'license':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-emerald-500" /> {t.drivingLicense}
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.licenseNumber}</label>
                <input 
                  type="text" 
                  name="licenseNo"
                  value={formData.licenseNo}
                  onChange={handleInputChange}
                  placeholder={t.licensePlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.licensePhoto}</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden">
                    {previews.licensePhoto ? (
                      <img src={previews.licensePhoto} alt="License Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="text-zinc-600" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'licensePhoto')}
                    className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'vehicle':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Car className="text-emerald-500" /> {t.vehicleInfo}
              </h2>

              {/* Vehicle Category Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-400">{t.vehicleType}</label>

                {categoriesLoading ? (
                  /* Skeleton loaders */
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : categories.length > 0 ? (
                  <div className="space-y-3">
                    {categories.map(cat => {
                      const isSelected = formData.vehicleType === cat.id;
                      return (
                        <motion.button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, vehicleType: cat.id }))}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-emerald-500/20' : 'bg-zinc-800'
                          }`}>
                            {cat.icon ? (
                              <img src={cat.icon} alt={cat.name} className="w-7 h-7 object-contain" />
                            ) : (
                              <Car className={`w-6 h-6 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-bold truncate ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                                {cat.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-xs text-zinc-500">
                                <Users className="w-3 h-3" />
                                {cat.capacity} seats
                              </span>
                              <span className="flex items-center gap-1 text-xs text-zinc-500">
                                <IndianRupee className="w-3 h-3" />
                                {cat.baseFare} base · {cat.perKmRate}/km
                              </span>
                            </div>
                          </div>

                          {/* Selected indicator */}
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  /* Fallback plain select if Firestore is empty */
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500 transition-all appearance-none"
                  >
                    <option value="Auto">{t.auto}</option>
                    <option value="Economy">{t.economy}</option>
                    <option value="Premium">{t.premium}</option>
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.vehicleNumber}</label>
                <input 
                  type="text" 
                  name="vehicleNo"
                  value={formData.vehicleNo}
                  onChange={handleInputChange}
                  placeholder={t.vehiclePlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.rcBookNumber}</label>
                <input 
                  type="text" 
                  name="rcBookNumber"
                  value={formData.rcBookNumber}
                  onChange={handleInputChange}
                  placeholder={t.rcPlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.rcBookPhoto}</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden">
                    {previews.rcBookPhoto ? (
                      <img src={previews.rcBookPhoto} alt="RC Book Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="text-zinc-600" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'rcBookPhoto')}
                    className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'payment':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="text-emerald-500" /> {t.paymentDetails}
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t.upiId}</label>
                <input 
                  type="text" 
                  name="upiNumber"
                  value={formData.upiNumber}
                  onChange={handleInputChange}
                  placeholder={t.upiPlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <p className="text-xs text-zinc-500">{t.upiHint}</p>
            </div>
          </motion.div>
        );
      case 'success':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-10"
          >
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-emerald-500 w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t.successTitle}</h2>
              <p className="text-zinc-400">{t.successDesc}</p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-emerald-500 text-zinc-950 font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-all"
            >
              {t.goDashboard}
            </button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900 rounded-full text-zinc-50">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight italic">{t.title}</h1>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-black">{t.subtitle}</p>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Languages size={20} />
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <button onClick={() => { setLanguage('en'); setShowLangMenu(false); }} className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-zinc-800 transition-colors ${language === 'en' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-400'}`}>English</button>
                  <button onClick={() => { setLanguage('hi'); setShowLangMenu(false); }} className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-zinc-800 transition-colors ${language === 'hi' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-400'}`}>हिन्दी (Hindi)</button>
                  <button onClick={() => { setLanguage('gu'); setShowLangMenu(false); }} className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-zinc-800 transition-colors ${language === 'gu' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-400'}`}>ગુજરાતી (Gujarati)</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {step !== 'success' && (
          <div className="flex gap-2 mb-8">
            {(['personal', 'license', 'vehicle', 'payment'] as OnboardingStep[]).map((s, i) => (
              <div 
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  step === s ? 'bg-emerald-500' : 
                  i < ['personal', 'license', 'vehicle', 'payment'].indexOf(step) ? 'bg-emerald-500/50' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {step !== 'success' && (
          <div className="mt-8 flex gap-4">
            {step !== 'personal' && (
              <button 
                onClick={prevStep}
                disabled={loading}
                className="flex-1 bg-zinc-900 text-zinc-50 font-bold py-4 rounded-2xl hover:bg-black transition-all border border-zinc-800 disabled:opacity-50"
              >
                {t.back}
              </button>
            )}
            <button 
              onClick={step === 'payment' ? handleSubmit : nextStep}
              disabled={loading}
              className="flex-[2] bg-emerald-500 text-zinc-950 font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {step === 'payment' ? t.submit : t.continue}
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
