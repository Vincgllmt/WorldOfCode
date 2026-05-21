import 'dart:async';
import 'dart:io';
import 'package:in_app_purchase/in_app_purchase.dart';
import '../main.dart';

class IAPService {
  static final IAPService _instance = IAPService._internal();
  factory IAPService() => _instance;
  IAPService._internal();

  final InAppPurchase _iap = InAppPurchase.instance;
  late StreamSubscription<List<PurchaseDetails>> _subscription;
  
  // Signal pour informer l'UI qu'un achat a réussi
  final StreamController<bool> _purchaseSuccessController = StreamController<bool>.broadcast();
  Stream<bool> get purchaseSuccessStream => _purchaseSuccessController.stream;

  static const String monthlyID = 'purple_monthly_099';
  static const String yearlyID = 'purple_yearly_499';
  static const String lifetimeID = 'purple_lifetime_999';

  List<ProductDetails> products = [];
  bool isAvailable = false;

  void initialize() {
    if (!Platform.isAndroid && !Platform.isIOS && !Platform.isMacOS) return;

    final Stream<List<PurchaseDetails>> purchaseUpdated = _iap.purchaseStream;
    _subscription = purchaseUpdated.listen(
      _onPurchaseUpdate,
      onDone: () => _subscription.cancel(),
      onError: (error) => print("Erreur IAP: $error"),
    );
    _initIAP();
  }

  Future<void> _initIAP() async {
    isAvailable = await _iap.isAvailable();
    if (isAvailable) {
      await fetchProducts();
    }
  }

  Future<void> fetchProducts() async {
    if (!Platform.isAndroid && !Platform.isIOS && !Platform.isMacOS) return;
    final Set<String> ids = {monthlyID, yearlyID, lifetimeID};
    final ProductDetailsResponse response = await _iap.queryProductDetails(ids);
    products = response.productDetails;
    products.sort((a, b) => a.rawPrice.compareTo(b.rawPrice));
  }

  void buyProduct(ProductDetails product) {
    final PurchaseParam purchaseParam = PurchaseParam(productDetails: product);
    _iap.buyNonConsumable(purchaseParam: purchaseParam);
  }

  Future<void> _onPurchaseUpdate(List<PurchaseDetails> purchaseDetailsList) async {
    for (var purchase in purchaseDetailsList) {
      if (purchase.status == PurchaseStatus.purchased || purchase.status == PurchaseStatus.restored) {
        bool valid = await _verifyPurchase(purchase);
        if (valid) {
          await _deliverProduct(purchase);
          // On signale le succès à l'écran
          _purchaseSuccessController.add(true);
        }
      }
      if (purchase.pendingCompletePurchase) {
        await _iap.completePurchase(purchase);
      }
      // En cas d'erreur ou annulation, on peut aussi signaler pour arrêter les loaders
      if (purchase.status == PurchaseStatus.error || purchase.status == PurchaseStatus.canceled) {
        _purchaseSuccessController.add(false);
      }
    }
  }

  Future<bool> _verifyPurchase(PurchaseDetails purchase) async => true;

  Future<void> _deliverProduct(PurchaseDetails purchase) async {
    if (purchase.productID == monthlyID) {
      await trialService.activateSubscription(const Duration(days: 30));
    } else if (purchase.productID == yearlyID) {
      await trialService.activateSubscription(const Duration(days: 365));
    } else if (purchase.productID == lifetimeID) {
      await trialService.setPro();
    }
  }

  void dispose() {
    _subscription.cancel();
    _purchaseSuccessController.close();
  }
}
