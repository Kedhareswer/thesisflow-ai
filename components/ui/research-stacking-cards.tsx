'use client';
import { ReactLenis } from 'lenis/react';
import { useTransform, motion, useScroll, MotionValue } from 'motion/react';
import { useRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, FileText, Search, Brain, Users, Zap } from 'lucide-react';

interface ResearchFeature {
  title: string;
  description: string;
  image: string;
  color: string;
  icon: React.ReactNode;
}

interface CardProps {
  i: number;
  title: string;
  description: string;
  image: string;
  color: string;
  icon: React.ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
  targetScale: number;
}

export const ResearchCard = ({
  i,
  title,
  description,
  image,
  color,
  icon,
  progress,
  range,
  targetScale,
}: CardProps) => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start end', 'start start'],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [2, 1]);
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <div
      ref={container}
      className='h-screen flex items-center justify-center sticky top-0'
    >
      <motion.div
        style={{
          backgroundColor: color,
          scale,
          top: `calc(-5vh + ${i * 25}px)`,
        }}
        className={`flex flex-col relative -top-[25%] h-[450px] w-[70%] rounded-xl p-10 origin-top shadow-2xl`}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            {icon}
          </div>
          <h2 className='text-3xl font-bold text-white'>{title}</h2>
        </div>
        
        <div className={`flex h-full gap-10`}>
          <div className={`w-[45%] relative flex flex-col justify-center`}>
            <p className='text-white/90 text-base leading-relaxed mb-6'>{description}</p>
            <span className='flex items-center gap-3 text-white/80 hover:text-white transition-colors cursor-pointer group'>
              <span className="text-sm font-medium">Explore Feature</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          <div className={`relative w-[55%] h-full rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm`}>
            <motion.div
              className={`w-full h-full`}
              style={{ scale: imageScale }}
            >
              <img 
                src={image} 
                alt={title} 
                className='absolute inset-0 w-full h-full object-cover rounded-xl' 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface ResearchStackingCardsProps {
  features: ResearchFeature[];
}

const ResearchStackingCards = forwardRef<HTMLElement, ResearchStackingCardsProps>(({ features }, ref) => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  return (
    <ReactLenis root>
      <main className='bg-black' ref={container}>
        <section className='text-white h-[70vh] w-full bg-neutral-950 grid place-content-center relative overflow-hidden'>
          {/* Grid pattern background */}
          <div className='absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]'></div>
          
          {/* Orange gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,107,44,0.12),transparent)]" />

          <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
            <h1 className='2xl:text-7xl text-5xl px-8 font-bold text-center tracking-tight leading-[120%] mb-6'>
              Powerful Research Tools <br /> 
              <span className="text-[#FF6B2C]">Built for You</span>
            </h1>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Discover how ThesisFlow-AI transforms your research workflow with intelligent automation
            </p>
            <div className="flex items-center justify-center gap-2 text-white/60">
              <span className="text-sm">Scroll to explore</span>
              <ArrowRight className="w-4 h-4 animate-bounce" style={{ animationDirection: 'alternate' }} />
            </div>
          </div>
        </section>

        <section className='text-white w-full bg-neutral-950'>
          {features.map((feature, i) => {
            const targetScale = 1 - (features.length - i) * 0.05;
            return (
              <ResearchCard
                key={`feature_${i}`}
                i={i}
                image={feature.image}
                title={feature.title}
                color={feature.color}
                description={feature.description}
                icon={feature.icon}
                progress={scrollYProgress}
                range={[i * 0.25, 1]}
                targetScale={targetScale}
              />
            );
          })}
        </section>

        <footer className='group bg-neutral-950 py-20'>
          <h1 className='text-[12vw] translate-y-10 leading-[100%] uppercase font-bold text-center bg-gradient-to-r from-[#FF6B2C] via-orange-400 to-[#FF6B2C] bg-clip-text text-transparent transition-all ease-linear'>
            ThesisFlow
          </h1>
          <div className='bg-black h-32 relative z-10 grid place-content-center text-xl rounded-tr-full rounded-tl-full'>
            <p className="text-white/60 font-medium">AI-Powered Research Platform</p>
          </div>
        </footer>
      </main>
    </ReactLenis>
  );
});

ResearchStackingCards.displayName = 'ResearchStackingCards';

export default ResearchStackingCards;
