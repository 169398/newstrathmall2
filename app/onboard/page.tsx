
'use client';

import { PaymentBg } from "@/components/shared/Payment-bg";
import Footer from "@/components/shared/footer";



const WelcomeSellerPage = () => {
 

  return (
    <div className="min-h-screen   flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 w-full  container mx-auto  items-center text-center">
        <PaymentBg />
      </div>

      {/* Body Section */}
      <div className="flex-1 bg-gray-100 py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold mb-8">
            More Than Just Onboarding: Your Fee Unlocks a World of Value
          </h2>
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded shadow-md">
              <h3 className="text-2xl font-semibold mb-2">Free Marketing 📢</h3>
              <p>
                Benefit from our extensive marketing campaigns. We promote your
                products across various platforms, giving you maximum exposure
                without any additional cost.
              </p>
            </div>
            <div className="bg-white p-6 rounded shadow-md">
              <h3 className="text-2xl font-semibold mb-2">
                Server Hosting & Maintenance 💻
              </h3>
              <p>
                The last thing you want to worry about is server downtime. Our
                team of experts will ensure your shop is always up and running,
                so you can focus on what you do best.
              </p>
            </div>
            <div className="bg-white p-6 rounded shadow-md">
              <h3 className="text-2xl font-semibold mb-2">
                Seller Dashboard 📊
              </h3>
              <p>
                Get access to our seller dashboard, where you can manage your
                products, track sales, and monitor your performance. It&apos;s
                your one-stop shop for all things selling.
              </p>
            </div>
            <div className="bg-white p-6 rounded shadow-md">
              <h3 className="text-2xl font-semibold mb-2">Seller Support 🧑‍💻</h3>
              <p>
                Our dedicated support team is here to help you every step of the
                way. From setting up your shop to managing orders, we&apos;ve
                got you covered.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="  container rounded-sm">
        <Footer />
      </div>
    </div>
  );
};

export default WelcomeSellerPage;
