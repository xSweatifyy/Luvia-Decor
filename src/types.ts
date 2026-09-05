export type PageRoute = 'home' | 'catalog' | 'custom-order' | 'gallery' | 'contact' | 'cart' | 'terms' | 'privacy' | 'admin';

export interface ProductCategory { id: string; name: string; }
export interface Product { id:string; title:string; category:string; price:number; isPriceFrom?:boolean; pricePrefix?:string; compareAtPrice?:number; description:string; shortDescription?:string; details?:string[]; imageUrl:string; gallery?:string[]; badge?:'Bestseller'|'Novinka'|'Limitovaná edice'|'Na zakázku'|'Oblíbené'; inStock:boolean; featured?:boolean; dimensions?:string; materials?:string; estimatedDelivery?:string; }
export interface CartItem { product:Product; quantity:number; customNote?:string; }
export interface OrderItem { productId:string; title:string; price:number; quantity:number; imageUrl:string; customNote?:string; category?:string; }
export interface OrderCustomer { fullName:string; email:string; phone:string; street:string; city:string; zip:string; country:string; note?:string; }
export type DeliveryMethod = 'address'|'pickup_point'|'personal_pickup';
export type DeliveryCarrier = string;
export interface DeliverySelection { method:DeliveryMethod; carrier?:DeliveryCarrier; pickupPoint?:string; }
export interface ShippingCarrierConfig { enabled:boolean; address:number; pickup_point:number; }
export interface ShippingConfig { carriers:Record<string, ShippingCarrierConfig>; personalPickup:{ enabled:boolean; price:number; label:string; }; }
export type OrderStatus = 'nova'|'zpracovava_se'|'zaplaceno'|'u_prepravce'|'odeslano'|'dokonceno'|'zruseno';
export interface Order { id:string; orderNumber:string; createdAt:string; customer:OrderCustomer; items:OrderItem[]; subtotal:number; shipping:number; discount?:number; couponCode?:string; totalPrice:number; delivery?:DeliverySelection; status:OrderStatus; resendSent?:boolean; resendError?:string; }
export interface GalleryItem { id:string; title:string; category:string; imageUrl:string; description?:string; }
export interface Review { id:string; author:string; city:string; rating:number; text:string; date:string; occasion?:string; }
export interface SiteConfig { siteName:string; slogan:string; logoText:string; logoImageUrl?:string; faviconUrl?:string; responsiblePerson:string; registeredOffice:string; ico:string; supportEmail:string; ordersEmail:string; phone:string; phoneDisplay:string; phone2:string; phone2Display:string; whatsapp:string; whatsappDisplay:string; instagramUrl:string; facebookUrl:string; consultationUrl:string; mapAddress:string; mapEmbedUrl:string; announcement:{enabled:boolean;text:string;linkText?:string;linkPage?:PageRoute}; hero:{badge:string;title:string;titleEmphasis:string;subtitle:string;primaryCtaText:string;secondaryCtaText:string;bgImageUrl:string}; about:{subtitle:string;title:string;quote:string;p1:string;p2:string;p3:string;imageUrl:string;ownerName:string;ownerRole:string;stat1Number:string;stat1Label:string;stat2Number:string;stat2Label:string;stat3Number:string;stat3Label:string}; customBanner:{title:string;subtitle:string;buttonText:string;imageUrl:string}; resend:{apiKey:string;senderEmail:string;notifyEmail:string}; shipping?:ShippingConfig; }
export interface Coupon { id:string; code:string; type:'percent'|'fixed'|'shipping'; value:number; active:boolean; createdAt:string; categoryIds?:string[]; note?:string; remainingValue?:number; shippingScope?:'all'|'carrier'; shippingCarrier?:'DPD'|'Zásilkovna'; }
export interface AdminUser { id:string; email:string; name:string; role:'admin'|'editor'; createdAt:string; lastLogin?:string; }
export interface ToastMessage { id:string; type:'success'|'error'|'info'; title:string; message?:string; }
